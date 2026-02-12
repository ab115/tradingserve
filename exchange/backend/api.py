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
    
    # 1. Subscribe to Orders Channel (Command & Control for Activity)
    await pubsub.subscribe(REDIS_ORDER_CHANNEL)
    logger.info(f"Subscribed to {REDIS_ORDER_CHANNEL}")
    
    subscribed_tickers = set()

    # 2. Initial Scan: Subscribe to active tickers (existing books)
    try:
        keys = await r.keys("exchange:snapshot:*")
        for k in keys:
            # exchange:snapshot:{symbol}
            parts = k.split(":")
            if len(parts) == 3:
                symbol = parts[2]
                channel = f"market_data_updates:{symbol}"
                await pubsub.subscribe(channel)
                subscribed_tickers.add(symbol)
                logger.info(f"Subscribed to Market Data for Active Ticker: {symbol}")
    except Exception as e:
        logger.error(f"Error during initial ticker scan: {e}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"]
                data = message["data"]
                
                try:
                    # logger.info(f"Received Redis Message on {channel}: {data[:100]}...") 
                    parsed_data = json.loads(data)
                    msg_type = "UNKNOWN"
                    
                    if channel == REDIS_ORDER_CHANNEL:
                        # Check for New Activity to Subscribe
                        # Payload might be NEW_ORDER or EXECUTION_REPORT or just a dict
                        # Exchange Engine publishes various formats.
                        # ExecutionReport has 'Symbol'. NewOrder has 'Symbol'.
                        symbol = parsed_data.get('Symbol')
                        if symbol and symbol not in subscribed_tickers:
                            # Dynamic Subscription
                            md_channel = f"market_data_updates:{symbol}"
                            await pubsub.subscribe(md_channel)
                            subscribed_tickers.add(symbol)
                            logger.info(f"Dynamic Subscription: Found new active ticker {symbol}")

                        # Determine Type for UI Broadcast
                        if parsed_data.get('type') == 'RESET':
                             msg_type = 'RESET'
                        elif "OrdStatus" in parsed_data:
                            msg_type = "EXECUTION_REPORT"
                        else:
                            msg_type = "NEW_ORDER"
                            
                    elif channel.startswith("market_data_updates"):
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
    allow_headers=["*"],
)

from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

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
        # Fetch Full Order Book State (Persisted)
        data = await r.get(f"exchange:snapshot:{symbol}")
        
        aggregated_book = {
            "type": "BOOK_SNAPSHOT",
            "symbol": symbol,
            "bids": [],
            "asks": [],
            "last_price": 0.0,
            "trades": []
        }

        if data:
            try:
                full_state = json.loads(data)
                # We need to aggregate raw orders into price levels
                # We can reuse the logic from OrderBook class if we import it, 
                # but to avoid heavy dependencies in API, let's implement lightweight aggregation here.
                
                # We need to aggregate raw orders into price levels + entity
                
                bids_map = {}
                asks_map = {}
                
                for order in full_state.get('orders', []):
                    price = float(order.get('price', 0))
                    qty = int(order.get('qty', 0))
                    side = order.get('side')
                    entity = order.get('sender_comp_id', 'Anonymous')
                    key = (price, entity)
                    
                    if side == 'Buy':
                        bids_map[key] = bids_map.get(key, 0) + qty
                    else:
                        asks_map[key] = asks_map.get(key, 0) + qty
                
                # Sort and Format Bids (Price DESC, Entity DESC)
                sorted_keys_bids = sorted(bids_map.keys(), key=lambda x: (x[0], x[1]), reverse=True)
                sorted_bids = []
                for p, e in sorted_keys_bids[:20]:
                    sorted_bids.append({"price": p, "qty": bids_map[(p, e)], "total": 0, "entity": e})

                # Sort and Format Asks (Price ASC, Entity ASC)
                sorted_keys_asks = sorted(asks_map.keys(), key=lambda x: (x[0], x[1]))
                sorted_asks = []
                for p, e in sorted_keys_asks[:20]:
                    sorted_asks.append({"price": p, "qty": asks_map[(p, e)], "total": 0, "entity": e})
                
                aggregated_book['bids'] = sorted_bids
                aggregated_book['asks'] = sorted_asks
                
            except Exception as e:
                logger.error(f"Snapshot aggregation error: {e}")

        # Fetch Last Market Price
        market_price = await r.hget(f"market_data:{symbol}", "price")
        if market_price:
             try:
                 aggregated_book['last_price'] = float(market_price)
             except: pass

        # Fetch Trade History
        try:
            trade_history_raw = await r.lrange(f"exchange:trades:{symbol}", 0, -1)
            aggregated_book['trades'] = [json.loads(t) for t in trade_history_raw]
            # Use trade count as total volume proxy
            aggregated_book['total_volume'] = len(aggregated_book['trades']) 
            # Or sum of quantities? 
            # If trade object has 'qty', we can sum.
            # let's be accurate.
            aggregated_book['total_volume'] = sum(int(t.get('qty', 0)) for t in aggregated_book['trades'])
        except Exception as e:
            logger.error(f"Error fetching trade history: {e}")
                 
        return aggregated_book
    finally:
        await r.close()

@app.get("/tickers")
async def get_tickers():
    """
    Returns list of tickers derived from available market data keys,
    sorted by activity (trade count proxy).
    """
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    try:
        # Scan for market_data keys (Source of Truth for "Active" tickers)
        # Or keys exchange:snapshot:* which implies book state exists.
        # Let's use exchange:snapshot:* as it implies functional book.
        keys = await r.keys("exchange:snapshot:*")
        tickers_stats = []
        
        pipeline = r.pipeline()
        found_symbols = []
        
        for k in keys:
            # key format: exchange:snapshot:{symbol}
            parts = k.split(":")
            if len(parts) == 3:
                symbol = parts[2]
                found_symbols.append(symbol)
                # Queue command to check trade volume (list length)
                pipeline.llen(f"exchange:trades:{symbol}")
        
        if not found_symbols:
            return []

        # Execute Pipeline
        volumes = await pipeline.execute()
        
        for i, symbol in enumerate(found_symbols):
            tickers_stats.append({
                "symbol": symbol,
                "volume": volumes[i] # Uses trade count as proxy for activity
            })
            
        # Sort by volume desc
        tickers_stats.sort(key=lambda x: x['volume'], reverse=True)
        
        # Return simple list of strings if client expects strings, OR objects?
        # Current App.tsx expects simple list of strings in one fetch logic, 
        # But we want to preserve this order.
        # If we return strings, client just gets them. 
        # But Client needs to know they are "Top 5".
        # If I return SORTED list of strings, Client takes first 5.
        
        return [t['symbol'] for t in tickers_stats]

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
        # 1. Publish RESET signal to Matching Engine (Clear Memory) via Stream
        # Worker now listens to Stream, not PubSub for commands
        await r.xadd("orders:stream", {"type": "RESET"})
        
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
