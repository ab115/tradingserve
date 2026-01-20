import redis.asyncio as redis
import asyncio
import json
import os
from typing import List, Optional
from models import Position
import config

class MarketDataWorker:
    def __init__(self):
        self.redis = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
        self.pubsub = self.redis.pubsub()

    async def subscribe_ticker(self, ticker: str):
        channel = f"market_data_updates:{ticker}"
        await self.pubsub.subscribe(channel)
        print(f"Subscribed to {channel}")

    async def verify_connection(self):
        """Ensures Redis connection is alive."""
        try:
            await self.redis.ping()
            return True
        except redis.ConnectionError:
            print("MarketDataWorker: Cannot connect to Redis")
            return False

    async def run_subscription_loop(self, broadcast_callback):
        """
        Subscribes to market_data_updates and updates positions in real-time.
        broadcast_callback: async function(data: str) to send updates to WebSocket clients.
        """
        # Global Subscribe Removed for Optimization
        # await self.pubsub.subscribe('market_data_updates')
        print("MarketDataWorker: Waiting for specific ticker subscriptions...")

        while True:
            try:
                # Use get_message directly on pre-initialized pubsub
                message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    await self.process_message(message, broadcast_callback)
                
                await asyncio.sleep(0.01) # Yield to event loop
            except Exception as e:
                print(f"Error in subscription loop: {e}")
                await asyncio.sleep(1)

    async def process_message(self, message, broadcast_callback):
        try:
            raw_data = message['data']
            if isinstance(raw_data, bytes):
                raw_data = raw_data.decode('utf-8')
                
            data = json.loads(raw_data)
            
            # ... (parsing logic unchanged) ...
            msg_type = data.get('type')
            ticker = data.get('ticker') or data.get('symbol')
            # ...
            price = 0.0
            if 'price' in data: price = float(data['price'])
            elif 'last_price' in data: price = float(data['last_price'])
            elif 'current_price' in data: price = float(data['current_price'])
            
            if not ticker or price <= 0:
                return

            # Check if we hold a position in this ticker
            key = f"marketmaker:position:{ticker}"
            if not await self.redis.exists(key):
                return

            # Fetch current details for PnL
            pos_data = await self.redis.hgetall(key)
            if not pos_data:
                return

            current_qty = int(pos_data.get('quantity', 0))
            avg_price = float(pos_data.get('avg_price', 0.0))
            algo_active = str(pos_data.get('algo_active', 'true')).lower() == 'true'
            
            pnl = (price - avg_price) * current_qty
            
            mapping = {
                "current_price": price,
                "pnl": pnl
            }
            # algo_active does not change here
            await self.redis.hset(key, mapping=mapping)
            
            # Construct update object for Frontend
            position = Position(
                ticker=ticker,
                quantity=current_qty,
                market=pos_data.get('market', ''),
                avg_price=avg_price,
                current_price=price,
                pnl=pnl,
                algo_active=algo_active
            )
            
            # Broadcast to UI
            await broadcast_callback(json.dumps([position.model_dump()]))

        except Exception as e:
            print(f"Error processing update: {e}")

