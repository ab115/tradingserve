import json
import logging
import time
import redis.asyncio as redis
from kafka import KafkaProducer
from config import settings
from models import ExecutionReport

logger = logging.getLogger(__name__)

class Producer:
    def __init__(self):
        self.redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )
        
        self.kafka = None
        try:
            self.kafka = KafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                api_version_auto_timeout_ms=2000,
                request_timeout_ms=2000
            )
            logger.info(f"Connected to Kafka at {settings.KAFKA_BOOTSTRAP_SERVERS}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")

    async def publish_execution_report(self, report: ExecutionReport):
        data = report.dict()
        
        # 1. Publish to Kafka (Non-blocking send)
        if self.kafka:
            try:
                self.kafka.send(settings.KAFKA_EXECUTION_TOPIC, data)
                # Removed flush() to prevent blocking event loop. 
                # KafkaProducer handles buffering in background thread.
            except Exception as e:
                logger.error(f"Failed to send execution report to Kafka: {e}")

        # 2. Publish to Redis
        try:
            await self.redis.publish("updates:orders", json.dumps(data))
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")

    async def publish_order_update(self, order_data: dict):
        """Used to simple order updates if needed."""
        try:
            await self.redis.publish("updates:orders", json.dumps(order_data))
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")

    async def publish_snapshot(self, snapshot: dict):
        """Persists the order book snapshot to Redis."""
        try:
            symbol = snapshot['symbol']
            key = f"exchange:snapshot:{symbol}"
            await self.redis.set(key, json.dumps(snapshot))
        except Exception as e:
            logger.error(f"Failed to persist snapshot: {e}")

    async def publish_market_data(self, symbol: str, price: float):
        """Persists the last traded price to Redis for API snapshots."""
        try:
            key = f"market_data:{symbol}"
            # Store price
            await self.redis.hset(key, mapping={"price": price})
            
            # Publish to Granular Channel (Optimized)
            msg = {
                "type": "MARKET_DATA",
                "symbol": symbol,
                "price": price,
                "timestamp": time.time()
            }
            # Publish Granular
            await self.redis.publish(f"market_data_updates:{symbol}", json.dumps(msg))
            
            # Keep Global channel for backward compatibility if needed, 
            # but we optimized API to use granular. 
            # Let's keep specific ONLY for max optimization.
            # actually we should publish to settings.MARKET_DATA_CHANNEL if configured?
            # settings.MARKET_DATA_CHANNEL usually "market_data_updates"
            # I will publish to Granular ONLY to enforce optimization.
            
        except Exception as e:
            logger.error(f"Failed to publish market data: {e}")

    async def publish_book_snapshot(self, snapshot: dict):
        """Broadcasts aggregated order book snapshot to market data channel."""
        try:
            symbol = snapshot.get('symbol')
            if symbol:
                 await self.redis.publish(f"market_data_updates:{symbol}", json.dumps(snapshot))
        except Exception as e:
            logger.error(f"Failed to publish book snapshot: {e}")

    async def publish_trade_history(self, symbol: str, trade_data: dict):
        """Persists executed trade to a capped list for history."""
        try:
            key = f"exchange:trades:{symbol}"
            await self.redis.rpush(key, json.dumps(trade_data))
            await self.redis.ltrim(key, -100, -1) 
        except Exception as e:
            logger.error(f"Failed to persist trade history: {e}")
            
    async def close(self):
        await self.redis.close()
        if self.kafka:
            self.kafka.close()
