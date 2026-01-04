import json
import redis
from config import settings
from typing import Dict, Any

class RedisStorage:
    def __init__(self):
        self.r = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )

    def store_order(self, order_id: str, order_data: Dict[str, Any]):
        """Persist order data to Redis."""
        # Using a hash for order details for easy access
        # Key: "order:{order_id}"
        # Filter None values for Redis compatibility
        safe_data = {k: v for k, v in order_data.items() if v is not None}
        if safe_data:
            self.r.hset(f"order:{order_id}", mapping=safe_data)
            # Publish event for real-time UI
            self.r.publish("updates:orders", json.dumps(safe_data))
        
        # Also add to a robust list or set if needed for all orders
        # For simple retrieval of all IDs
        self.r.sadd("orders:all", order_id)

    def store_session_message(self, session_id: str, message_type: str, message_data: Dict[str, Any]):
        """Persist session related messages (Logon, Heartbeat, etc)."""
        # Store in a list for the session
        key = f"session:{session_id}:messages"
        data = {
            "type": message_type,
            "session_id": session_id,
            "data": message_data,
            "timestamp": message_data.get("SendingTime")
        }
        self.r.rpush(key, json.dumps(data))
        # Add to set of known sessions
        self.r.sadd("sessions:all", session_id)
        # Publish event for real-time UI
        self.r.publish("updates:sessions", json.dumps(data))
        # Keep list size manageable if needed, but per requirements "all... messages should be saved"

    def get_order(self, order_id: str) -> Dict[str, Any]:
        return self.r.hgetall(f"order:{order_id}")

    def get_all_orders(self) -> list:
        order_ids = self.r.smembers("orders:all")
        orders = []
        for oid in order_ids:
            orders.append(self.get_order(oid))
        return orders
