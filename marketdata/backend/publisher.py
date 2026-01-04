import json
import redis
import logging
from kafka import KafkaProducer, errors as kafka_errors
from config import REDIS_HOST, REDIS_PORT, REDPANDA_BROKER, MARKET_DATA_TOPIC

logger = logging.getLogger("Publisher")

class MarketDataPublisher:
    def __init__(self):
        # Initialize Kafka (Redpanda)
        self.kafka_producer = None
        try:
            self.kafka_producer = KafkaProducer(
                bootstrap_servers=REDPANDA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8'),
                api_version=(2, 0, 2)
            )
            logger.info(f"Connected to Redpanda at {REDPANDA_BROKER}")
        except Exception as e:
            logger.error(f"Failed to connect to Redpanda: {e}")

        # Initialize Redis
        self.redis_client = None
        try:
            self.redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
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
                        pipe.publish(f"market_data_updates", json.dumps(update))
                pipe.execute()
            except Exception as e:
                logger.error(f"Error publishing to Redis: {e}")

    def close(self):
        if self.kafka_producer:
            self.kafka_producer.close()
        if self.redis_client:
            self.redis_client.close()
