import redis.asyncio as redis
import orjson
from typing import Any, Optional

class RedisClient:
    """
    High-performance Redis wrapper using orjson for serialization.
    """
    def __init__(self, host: str, port: int, db: int = 0, password: Optional[str] = None):
        self._pool = redis.ConnectionPool(
            host=host, 
            port=port, 
            db=db, 
            password=password, 
            decode_responses=True
        )
        self.client = redis.Redis(connection_pool=self._pool)

    async def publish(self, channel: str, message: Any):
        """Publish a message to a channel, automatically serializing data."""
        if not isinstance(message, (str, bytes)):
            # orjson.dumps returns bytes, which is optimal for Redis
            message = orjson.dumps(message)
        await self.client.publish(channel, message)

    async def get_json(self, key: str) -> Any:
        """Get a value and deserialize it."""
        data = await self.client.get(key)
        if data:
            return orjson.loads(data)
        return None

    async def set_json(self, key: str, value: Any, ex: int = None):
        """Set a value with serialization."""
        await self.client.set(key, orjson.dumps(value), ex=ex)
        
    async def close(self):
        await self.client.aclose()
        await self._pool.disconnect()
