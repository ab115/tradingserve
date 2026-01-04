import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from contextlib import asynccontextmanager

from provider import MarketDataProvider
from publisher import MarketDataPublisher
from config import BATCH_SIZE, UPDATE_INTERVAL_SECONDS

# Globals
provider = MarketDataProvider()
publisher = MarketDataPublisher()
active_websockets: List[WebSocket] = []

async def fetch_and_publish_loop():
    print("Starting Market Data Loop...")
    all_tickers = provider.get_tickers()
    total_tickers = len(all_tickers)
    cursor = 0
    
    while True:
        try:
            # Determine batch
            end_idx = cursor + BATCH_SIZE
            batch = []
            if end_idx <= total_tickers:
                batch = all_tickers[cursor:end_idx]
                cursor = end_idx if end_idx < total_tickers else 0 # simple reset if exact match
            else:
                batch = all_tickers[cursor:]
                remaining = BATCH_SIZE - len(batch)
                batch.extend(all_tickers[:remaining])
                cursor = remaining
            
            if cursor >= total_tickers:
                 cursor = 0
                 
            # Fetch
            updates = await provider.fetch_prices_async(batch)
            
            if updates:
                # 1. Publish to Redpanda
                # 1. Publish to Redpanda (Offloaded to thread to avoid blocking loop)
                # This prevents 'flush()' in publisher from stalling WebSockets
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, publisher.publish, updates)
                
                # 2. Broadcast to WebSockets (Individually per ticker)
                for update in updates:
                     msg = json.dumps(update)
                     for ws in active_websockets:
                        try:
                            await ws.send_text(msg)
                        except:
                            pass # Handle disconnects in the endpoint
                        
                print(f"Processed {len(updates)} updates.")
                
        except Exception as e:
            print(f"Error in loop: {e}")
            
        await asyncio.sleep(UPDATE_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(fetch_and_publish_loop())
    yield
    # Shutdown
    task.cancel()
    publisher.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/marketdata")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        active_websockets.remove(websocket)

@app.websocket("/ws/news/{ticker}")
async def news_endpoint(websocket: WebSocket, ticker: str):
    await websocket.accept()
    try:
        while True:
            try:
                # Wrap invalid executor state during shutdown
                news = await provider.fetch_news_async(ticker)
                
                # Ensure news is a list, and serialize safely
                if not isinstance(news, list):
                    news = []
                await websocket.send_text(json.dumps(news, default=str))
            except RuntimeError:
                # Executor shutdown, break loop
                break
            except Exception as e:
                import traceback
                print(f"News error for {ticker}: {str(e)}")
                traceback.print_exc()
                
            await asyncio.sleep(60) # Refresh news every 60s
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/sector/{ticker}")
async def sector_endpoint(websocket: WebSocket, ticker: str):
    await websocket.accept()
    try:
        # Sector data is mostly static, fetch once
        try:
            sector = await provider.fetch_sector_async(ticker)
            await websocket.send_text(json.dumps(sector))
        except RuntimeError:
            return # Shutdown
        except Exception as e:
            print(f"Sector error: {e}")
            await websocket.send_text("{}")
        
        while True:
            await websocket.receive_text() # Keep alive
    except WebSocketDisconnect:
        pass

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Market Data Backend Running", "endpoints": ["/ws/marketdata", "/ws/news/{ticker}", "/ws/sector/{ticker}"]}
