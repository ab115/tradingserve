from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import json
import asyncio
from config import settings

app = FastAPI(title="ECN Gateway Realtime API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Async Redis
r = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

@app.get("/orders")
async def get_orders():
    """Fetch all known orders."""
    order_ids = await r.smembers("orders:all")
    orders = []
    # Pipeline for efficiency?
    async with r.pipeline() as pipe:
        for oid in order_ids:
            pipe.hgetall(f"order:{oid}")
        results = await pipe.execute()
    
    # Merge results
    for oid, data in zip(order_ids, results):
        if data:
            data['internal_id'] = oid # Ensure ID is present
            orders.append(data)
    return orders

@app.get("/sessions")
async def get_sessions():
    """Fetch status of all sessions."""
    session_ids = await r.smembers("sessions:all")
    sessions = []
    for sid in session_ids:
        # Get latest status from Stream
        last_msgs = await r.xrevrange(f"stream:session:{sid}", count=1)
        status = "Unknown"
        if last_msgs:
            try:
                # Stream entry format: (msgid, {key: value})
                entry_data = last_msgs[0][1]
                status = entry_data.get('type')
            except: 
                pass
        sessions.append({"session_id": sid, "status": status})
    return sessions

@app.post("/orders")
async def place_order(order: dict):
    """Place an order and route to Exchange via Redis Stream."""
    import uuid
    from datetime import datetime
    
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat()
    
    symbol = order.get("symbol", "UNKNOWN")
    side = order.get("side", "BUY")
    qty = int(order.get("qty", 0))
    price = float(order.get("price", 0.0))
    
    # 1. Store Initial State in ECN Redis (so it shows in UI immediately)
    new_order = {
        "internal_id": order_id, # UI uses this if ClOrdID missing
        "ClOrdID": order_id,     # Standard ID
        "Symbol": symbol,        # PascalCase for UI consistency
        "Side": side,
        "OrderQty": str(qty),
        "Price": str(price),
        "Status": "New", 
        "TransactTime": timestamp, # ISO Timestamp
        "MsgType": "8",          # Execution Report type
        "OrdStatus": "New",
        "SenderCompID": "DEMO_USER",
        "TargetCompID": "EXCHANGE"
    }
    
    async with r.pipeline() as pipe:
        pipe.sadd("orders:all", order_id)
        pipe.hset(f"order:{order_id}", mapping=new_order)
        # Notify UI of "New" state immediately - Send FLATTENED object
        pipe.publish("updates:orders", json.dumps(new_order))
        await pipe.execute()
        
    # 2. Send to Exchange via Stream
    stream_entry = {
        "ClOrdID": order_id,
        "Symbol": symbol,
        "Side": side,
        "Price": str(price),
        "OrderQty": str(qty),
        "OrdType": "2", # LIMIT
        "SenderCompID": "DEMO_USER",
        "TargetCompID": "EXCHANGE",
        "TransactTime": timestamp
    }
    
    # XADD to 'orders:stream'
    await r.xadd("orders:stream", stream_entry)
    
    return {"status": "ok", "order_id": order_id}

# Mock fill removed: Real exchange will handle it.

@app.get("/admin/messages")
async def get_admin_messages(limit: int = 50):
    """Fetch recent session/admin messages."""
    session_ids = await r.smembers("sessions:all")
    messages = []
    for sid in session_ids:
        # Fetch from Stream
        stream_entries = await r.xrevrange(f"stream:session:{sid}", count=limit)
        for _, entry in stream_entries:
            try:
                # Entry keys: type, session_id, data (json string), timestamp
                msg = {
                    "type": entry.get("type"),
                    "session_id": entry.get("session_id"),
                    "data": json.loads(entry.get("data", "{}")),
                    "timestamp": entry.get("timestamp")
                }
                messages.append(msg)
            except:
                pass
    # Sort by timestamp (descending)
    messages.sort(key=lambda x: x.get('timestamp') or "", reverse=True)
    return messages[:limit]

@app.post("/reset")
async def reset_data():
    """Clear all orders and session history."""
    # 1. Clear Orders
    order_ids = await r.smembers("orders:all")
    if order_ids:
        # Construct keys to delete
        keys_to_del = [f"order:{oid}" for oid in order_ids]
        await r.delete(*keys_to_del)
    await r.delete("orders:all")

    # 2. Clear Sessions (Optional? User asked to clear orders, but reset implies full slate)
    # Let's clean up message history but maybe keep session IDs active if they are still connected?
    # If we delete session keys, the gateway msg handler will just recreate them on next msg.
    session_ids = await r.smembers("sessions:all")
    if session_ids:
        keys_to_del = [f"session:{sid}:messages" for sid in session_ids]
        await r.delete(*keys_to_del)
    await r.delete("sessions:all")
    
    # 3. Notify Clients via WS
    # Broadcast a special "RESET" message
    await r.publish("updates:orders", json.dumps({"type": "RESET"}))
    
    return {"status": "success", "message": "All data cleared."}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Subscribe to Redis channels
    pubsub = r.pubsub()
    await pubsub.subscribe("updates:orders", "updates:sessions")
    
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                channel = message['channel']
                data = message['data']
                # Send to WS client with channel info
                await websocket.send_json({
                    "channel": channel,
                    "payload": json.loads(data)
                })
            await asyncio.sleep(0.01) # Simple polling loop for now on pubsub
    except WebSocketDisconnect:
        await pubsub.unsubscribe()
    except Exception as e:
        print(f"WS Error: {e}")
        await pubsub.unsubscribe()
