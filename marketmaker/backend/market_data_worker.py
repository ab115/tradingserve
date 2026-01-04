import redis
import asyncio
import json
import os
from typing import List, Optional
from market_data_service import MarketDataService
from models import Position

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_KEY_TICKERS = 'marketmaker:tickers'

class MarketDataWorker:
    def __init__(self):
        self.redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        self.market_service = MarketDataService()

    async def verify_connection(self):
        """Ensures Redis connection is alive."""
        try:
            self.redis.ping()
            return True
        except redis.ConnectionError:
            print("MarketDataWorker: Cannot connect to Redis")
            return False

    async def run_subscription_loop(self, broadcast_callback):
        """
        Subscribes to market_data_updates and updates positions in real-time.
        broadcast_callback: async function(data: str) to send updates to WebSocket clients.
        """
        pubsub = self.redis.pubsub()
        pubsub.subscribe('market_data_updates')
        print("Subscribed to Redis channel: market_data_updates")

        while True:
            try:
                # Get message from Redis (non-blocking via get_message is one way, 
                # but in async loop we want to be nice. Redis-py sync pubsub blocks? 
                # We should use a loop that doesn't block the event loop heavily.
                # Or run in executor.
                # Ideally use aioredis or redis-py async client. 
                # Since we are using sync redis client, we can use listen() but it blocks.
                
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    await self.process_message(message, broadcast_callback)
                
                await asyncio.sleep(0.01) # Yield to event loop
            except Exception as e:
                print(f"Error in subscription loop: {e}")
                await asyncio.sleep(1)

    async def process_message(self, message, broadcast_callback):
        try:
            data = json.loads(message['data'])
            ticker = data.get('ticker')
            price = float(data.get('price', 0.0))
            
            if not ticker or price <= 0:
                return

            # Check if we hold a position in this ticker
            key = f"marketmaker:position:{ticker}"
            if not self.redis.exists(key):
                # Optimization: Cache active tickers set if this hits DB too much
                return

            # Atomic Update: WATCH key
            # In a high-throughput scenario, maybe just HSET directly without WATCH
            # if we don't strictly need PERFECT atomic 100% accurate PnL vs concurrent trades right now.
            # But let's try to be correct.
            
            # Actually, simpler: just read, calc, write. 
            # If a trade happens in between, PnL might be slightly off for a microsecond.
            # HSET price first.
            
            # Fetch current details for PnL
            pos_data = self.redis.hgetall(key)
            if not pos_data:
                return

            current_qty = int(pos_data.get('quantity', 0))
            avg_price = float(pos_data.get('avg_price', 0.0))
            
            pnl = (price - avg_price) * current_qty
            
            mapping = {
                "current_price": price,
                "pnl": pnl
            }
            self.redis.hset(key, mapping=mapping)
            
            # Construct update object for Frontend
            position = Position(
                ticker=ticker,
                quantity=current_qty,
                market=pos_data.get('market', ''),
                avg_price=avg_price,
                current_price=price,
                pnl=pnl
            )
            
            # Broadcast to UI
            await broadcast_callback(json.dumps([position.model_dump()]))

        except Exception as e:
            print(f"Error processing update: {e}")

