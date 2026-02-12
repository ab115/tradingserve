from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import asyncio
import redis.asyncio as redis
from contextlib import asynccontextmanager
import uvicorn
import config
from models import Position, PositionUpdate, PositionCreate
# Use Shared Core
from tradingserver_core.redis_client import RedisClient

# Globals (Cache for API read)
# Ideally API should read from Redis directly for "get_positions"
# But for now we might rely on the background subscriber to keep a reliable cache?
# Or just fetch from Redis on demand?
# PositionManager stores in Redis. So we can just fetch from Redis.
from position_manager import PositionManager
manager = PositionManager()

# Redis Publisher
redis_client = RedisClient(host=config.REDIS_HOST, port=config.REDIS_PORT)

async def redis_subscriber_loop(ws_manager):
    """Listens for updates and broadcasts to WS"""
    r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe("updates:positions", "updates:events")
    
    try:
        async for message in pubsub.listen():
             if message['type'] == 'message':
                try:
                    await ws_manager.broadcast(message['data'])
                except: pass
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.close()
        await r.aclose()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(redis_subscriber_loop(ws_manager))
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try: await connection.send_text(message)
            except: pass

ws_manager = ConnectionManager()

# --- ENDPOINTS ---

@app.get("/positions", response_model=List[Position])
async def get_positions():
    return manager.get_all_positions()

@app.post("/positions/update")
async def update_position(update: PositionUpdate):
    # This might be used by manual tools?
    manager.update_position(update)
    return {"status": "ok"}

@app.post("/positions/add")
async def add_position(create: PositionCreate):
    # Publish Command to Worker to add ticker
    await redis_client.publish("control:marketmaker", {"cmd": "add_ticker", "ticker": create.ticker})
    # Also add to DB
    await manager.add_position(create.ticker)
    return {"status": "ok", "ticker": create.ticker}

@app.get("/control/status")
async def get_control_status():
    # In a distributed system, we should ask the worker or check Redis key?
    # For now, return True or check a redis key 'mm:quoting_enabled'
    # Assume True for simplicity or implement redis key
    return {"quoting_enabled": True}

@app.post("/control/toggle")
async def toggle_quoting(enable: bool):
    await redis_client.publish("control:marketmaker", {"cmd": "toggle_quoting", "enable": enable})
    # Broadcast status update
    await ws_manager.broadcast(json.dumps({"type": "STATUS_UPDATE", "quoting_enabled": enable}))
    return {"status": "published"}

@app.post("/strategy/params")
async def update_strategy_params(params: dict):
    await redis_client.publish("control:marketmaker", {"cmd": "update_params", **params})
    return {"status": "published"}

@app.post("/strategy/switch")
async def switch_strategy(payload: dict):
    await redis_client.publish("control:marketmaker", {"cmd": "switch_strategy", "strategy": payload.get("strategy")})
    return {"status": "published"}

@app.post("/tools/sweep")
async def trigger_sweep():
    await redis_client.publish("control:marketmaker", {"cmd": "sweep"})
    return {"status": "sweep_triggered"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial positions
        positions = manager.get_all_positions()
        await websocket.send_text(json.dumps([p.model_dump() for p in positions]))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
