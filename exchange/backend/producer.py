import json
import logging
import time
import redis
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
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            logger.info(f"Connected to Kafka at {settings.KAFKA_BOOTSTRAP_SERVERS}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")

    def publish_execution_report(self, report: ExecutionReport):
        data = report.dict()
        
        # 1. Publish to Kafka
        if self.kafka:
            try:
                self.kafka.send(settings.KAFKA_EXECUTION_TOPIC, data)
                self.kafka.flush()
            except Exception as e:
                logger.error(f"Failed to send execution report to Kafka: {e}")

        # 2. Publish to Redis (for Realtime UI which likely listens to updates:orders)
        # We might need to transform it back to the 'Order' format or just send the report
        # The ECN gateway likely expects specific fields in `updates:orders`.
        # For now, let's publish the report as is, assuming UI handles it.
        try:
            self.redis.publish("updates:orders", json.dumps(data))
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")

    def publish_order_update(self, order_data: dict):
        """Used to simple order updates if needed."""
        try:
            self.redis.publish("updates:orders", json.dumps(order_data))
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")

    def publish_snapshot(self, snapshot: dict):
        """Persists the order book snapshot to Redis."""
        try:
            symbol = snapshot['symbol']
            key = f"exchange:snapshot:{symbol}"
            self.redis.set(key, json.dumps(snapshot))
            # Optional: Publish to a channel if UI wants to subscribe to full book updates?
            # self.redis.publish(f"updates:book:{symbol}", json.dumps(snapshot))
        except Exception as e:
            logger.error(f"Failed to persist snapshot: {e}")

    def publish_market_data(self, symbol: str, price: float):
        """Persists the last traded price to Redis for API snapshots."""
        try:
            key = f"market_data:{symbol}"
            # Store price. Can also store timestamp, volume, etc.
            self.redis.hset(key, mapping={"price": price})
            
            # Also publish to 'market_data_updates' channel for real-time (optional, if UI subscribed to it)
            # Currently UI uses EXECUTION_REPORT for updates, but a general market data feed is good practice.
            msg = {
                "type": "MARKET_DATA",
                "symbol": symbol,
                "price": price,
                "timestamp": time.time()
            }
            self.redis.publish(settings.MARKET_DATA_CHANNEL, json.dumps(msg))
            
        except Exception as e:
            logger.error(f"Failed to publish market data: {e}")

    def publish_trade_history(self, symbol: str, trade_data: dict):
        """Persists executed trade to a capped list for history."""
        try:
            key = f"exchange:trades:{symbol}"
            # RPUSH to append
            self.redis.rpush(key, json.dumps(trade_data))
            # LTRIM to keep last 100
            self.redis.ltrim(key, -100, -1) 
        except Exception as e:
            logger.error(f"Failed to persist trade history: {e}")
