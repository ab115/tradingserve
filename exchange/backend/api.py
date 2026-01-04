import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

# Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_ORDER_CHANNEL = "updates:orders"
MARKET_DATA_CHANNEL = "market_data_updates"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ExchangeAPI")

# Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Filter out disconnected?
        payload = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending message: {e}")

manager = ConnectionManager()

# Background Redis Consumer
async def redis_consumer():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(REDIS_ORDER_CHANNEL, MARKET_DATA_CHANNEL)
    
    logger.info(f"Subscribed to {REDIS_ORDER_CHANNEL} and {MARKET_DATA_CHANNEL}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"]
                data = message["data"]
                
                try:
                    parsed_data = json.loads(data)
                    # Enrich with type based on channel/content
                    msg_type = "UNKNOWN"
                    if channel == REDIS_ORDER_CHANNEL:
                        # Could be New Order, Execution Report, or RESET command
                        if parsed_data.get('type') == 'RESET':
                             msg_type = 'RESET'
                        elif "OrdStatus" in parsed_data:
                            msg_type = "EXECUTION_REPORT"
                        else:
                            msg_type = "NEW_ORDER"
                    elif channel == MARKET_DATA_CHANNEL:
                        msg_type = "MARKET_DATA"
                        
                    payload = {
                        "type": msg_type,
                        "data": parsed_data,
                        "channel": channel
                    }
                    await manager.broadcast(payload)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode JSON: {data}")
                    
    except asyncio.CancelledError:
        logger.info("Redis consumer cancelled")
    finally:
        await r.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(redis_consumer())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection open, ignore input
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/snapshot/{symbol}")
async def get_snapshot(symbol: str):
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    try:
        # Fetch Order Book Snapshot
        data = await r.get(f"exchange:snapshot:{symbol}")
        result = {}
        if data:
            result = json.loads(data)
        else:
            result = {"symbol": symbol, "bids": [], "asks": [], "orders": []}
            
        # Fetch Last Market Price
        market_price = await r.hget(f"market_data:{symbol}", "price")
        
        if market_price:
             try:
                 result['last_price'] = float(market_price)
             except Exception as e:
                 logger.error(f"Error converting price: {e}")
                 result['last_price'] = 0.0
        else:
             if 'last_price' not in result:
                 result['last_price'] = 0.0

        # Fetch Trade History
        try:
            trade_history_raw = await r.lrange(f"exchange:trades:{symbol}", 0, -1)
            trades = [json.loads(t) for t in trade_history_raw]
            result['trades'] = trades
        except Exception as e:
            logger.error(f"Error fetching trade history: {e}")
            result['trades'] = []
                 
        return result
    finally:
        await r.close()

@app.get("/tickers")
async def get_tickers():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    try:
        # Scan for market_data keys
        keys = await r.keys("market_data:*")
        tickers = []
        for k in keys:
            # key format: market_data:{symbol}
            parts = k.split(":")
            if len(parts) == 2:
                tickers.append(parts[1])
        return list(set(tickers))
    except Exception as e:
        logger.error(f"Failed to fetch tickers: {e}")
        return []
    finally:
        await r.close()

@app.delete("/reset")
async def reset_exchange():
    """Clears all exchange state."""
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    try:
        # 1. Publish RESET signal to Matching Engine (Clear Memory)
        await r.publish(REDIS_ORDER_CHANNEL, json.dumps({"type": "RESET"}))
        
        # 2. Aggressively Clear Persistence Keys
        # We need to find all keys related to the exchange
        patterns = ["market_data:*", "exchange:snapshot:*", "exchange:trades:*"]
        
        deleted_count = 0
        for pattern in patterns:
            keys = await r.keys(pattern)
            if keys:
                await r.delete(*keys)
                deleted_count += len(keys)
            
        logger.info(f"Exchange reset triggered via API. Deleted {deleted_count} redis keys.")
        return {"status": "success", "message": f"Exchange reset initiated. Cleared {deleted_count} records."}
    except Exception as e:
        logger.error(f"Error resetting exchange: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await r.close()
