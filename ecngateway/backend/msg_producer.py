import json
from kafka import KafkaProducer
from config import settings
from typing import Dict, Any
import redis
import logging

logger = logging.getLogger(__name__)

class MsgProducer:
    def __init__(self):
        # Redis Setup (Primary for Exchange Engine) - FORCE SYNC
        self.redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )

        # Kafka Setup (Legacy/Audit)
        self.producer = None
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                api_version_auto_timeout_ms=5000
            )
        except Exception as e:
            logger.warning(f"Could not connect to Kafka: {e}")

    def publish_order(self, order_data: Dict[str, Any]):
        """
        Publish order message.
        Primary: Redis Stream (orders:stream) for Matching Engine.
        Secondary: Kafka (orders) for Audit/Analytics.
        """
        # 1. Publish to Redis Stream for fast processing
        try:
            # XADD returns the ID of the added message
            self.redis.xadd("orders:stream", order_data)
        except Exception as e:
            logger.error(f"Failed to publish order to Redis Stream: {e}")

        # 2. Publish to Kafka
        if self.producer:
            try:
                self.producer.send(settings.KAFKA_ORDER_TOPIC, order_data)
            except Exception as e:
                logger.error(f"Failed to publish order to Kafka: {e}")

    def publish_session_msg(self, msg_type: str, session_id: str, msg_data: Dict[str, Any]):
        """Publish session message to 'fix_session_messages' topic."""
        # Session logs can stay on Kafka or Redis PubSub?
        # Let's add them to Redis Stream too for unity, simplified "log:session" stream
        if not self.producer: return
        payload = {
            "type": msg_type,
            "session_id": session_id,
            "data": msg_data
        }
        try:
            self.producer.send(settings.KAFKA_SESSION_TOPIC, payload)
        except Exception as e:
            logger.error(f"Failed to publish session msg: {e}")

    def close(self):
        if self.producer:
            self.producer.close()
