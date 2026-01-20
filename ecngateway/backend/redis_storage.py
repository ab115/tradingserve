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
        """Persist session related messages (Logon, Heartbeat, etc) to Redis Stream."""
        # Use streams for chronological, scalable storage
        stream_key = f"stream:session:{session_id}"
        
        # Flatten data for Redis Stream (strictly string keys/values usually preferred, but redis-py handles dicts)
        # We'll dump the complex 'data' dict to a JSON string
        entry = {
            "type": message_type,
            "session_id": session_id,
            "data": json.dumps(message_data),
            "timestamp": message_data.get("SendingTime") or ""
        }
        
        # XADD key * entry
        # maxlen=10000 ensures we don't run out of memory indefinitely
        self.r.xadd(stream_key, entry, maxlen=10000, approximate=True)
        
        # Add to set of known sessions
        self.r.sadd("sessions:all", session_id)
        
        # Publish event for real-time UI (keep this for now)
        self.r.publish("updates:sessions", json.dumps({
            "type": message_type, 
            "session_id": session_id, 
            "data": message_data
        }))

    def get_order(self, order_id: str) -> Dict[str, Any]:
        return self.r.hgetall(f"order:{order_id}")

    def get_all_orders(self) -> list:
        order_ids = self.r.smembers("orders:all")
        orders = []
        for oid in order_ids:
            orders.append(self.get_order(oid))
        return orders
