import json
import redis
import logging
from kafka import KafkaProducer, errors as kafka_errors
from config import REDIS_HOST, REDIS_PORT, REDPANDA_BROKER, MARKET_DATA_TOPIC

logger = logging.getLogger("Publisher")

class MarketDataPublisher:
    def __init__(self):
        self.kafka_producer = None
        self.redis_client = None

        self._redis_host = REDIS_HOST
        self._redis_port = REDIS_PORT

    def connect(self):
        # Initialize Kafka (Redpanda)
        if not self.kafka_producer:
            try:
                self.kafka_producer = KafkaProducer(
                    bootstrap_servers=REDPANDA_BROKER,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    key_serializer=lambda k: k.encode('utf-8'),
                    api_version=(2, 0, 2),
                    api_version_auto_timeout_ms=3000, 
                    request_timeout_ms=3000
                )
                logger.info(f"Connected to Redpanda at {REDPANDA_BROKER}")
            except Exception as e:
                logger.error(f"Failed to connect to Redpanda: {e}")

        # Initialize Redis
        self._ensure_redis()

    def _ensure_redis(self):
        if not self.redis_client:
            try:
                self.redis_client = redis.Redis(host=self._redis_host, port=self._redis_port, db=0, decode_responses=True)
                self.redis_client.ping()
                logger.info(f"Connected to Redis at {self._redis_host}:{self._redis_port}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.redis_client = None

    def publish(self, data: list):
        # 1. Publish to Redpanda (Streaming)
        if self.kafka_producer:
            try:
                for update in data:
                    ticker = update.get("ticker")
                    if ticker:
                        self.kafka_producer.send(
                            MARKET_DATA_TOPIC, 
                            value=update, 
                            key=ticker
                        )
                self.kafka_producer.flush()
            except Exception as e:
                logger.error(f"Error publishing to Redpanda: {e}")
        
        # 2. Publish to Redis (Real-time Cache)
        self._ensure_redis()
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                for update in data:
                    ticker = update.get("ticker")
                    if ticker:
                        # Store as Hash: market_data:{ticker}
                        key = f"market_data:{ticker}"
                        pipe.hset(key, mapping={
                            "price": str(update.get("price")),
                            "volume": str(update.get("volume")),
                            "time": str(update.get("time")),
                            "source": str(update.get("source"))
                        })
                        # Also publish to PubSub channel for real-time subscribers
                        # 1. Global Channel
                        pipe.publish(f"market_data_updates", json.dumps(update))
                        # 2. Ticker Channel (Optimization)
                        pipe.publish(f"market_data_updates:{ticker}", json.dumps(update))
                pipe.execute()
            except Exception as e:
                logger.error(f"Error publishing to Redis: {e}")

    def close(self):
        if self.kafka_producer:
            self.kafka_producer.close()
        if self.redis_client:
            self.redis_client.close()
