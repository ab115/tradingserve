import json
from kafka import KafkaProducer
from config import settings
from typing import Dict, Any

class MsgProducer:
    def __init__(self):
        self.producer = None
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                api_version_auto_timeout_ms=5000 # Faster timeout
            )
        except Exception as e:
            print(f"Warning: Could not connect to Kafka: {e}")

    def publish_order(self, order_data: Dict[str, Any]):
        """Publish order message to 'orders' topic."""
        if not self.producer: return
        try:
            future = self.producer.send(settings.KAFKA_ORDER_TOPIC, order_data)
        except Exception as e:
            print(f"Failed to publish order: {e}")

    def publish_session_msg(self, msg_type: str, session_id: str, msg_data: Dict[str, Any]):
        """Publish session message to 'fix_session_messages' topic."""
        if not self.producer: return
        payload = {
            "type": msg_type,
            "session_id": session_id,
            "data": msg_data
        }
        try:
            self.producer.send(settings.KAFKA_SESSION_TOPIC, payload)
        except Exception as e:
            print(f"Failed to publish session msg: {e}")

    def close(self):
        if self.producer:
            self.producer.close()
