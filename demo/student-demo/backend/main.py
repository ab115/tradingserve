from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from confluent_kafka import Consumer
import asyncio
import json
import os
import sys
import subprocess
import threading
import queue
import docker

# Add labs path to sys.path to allow execution of student scripts (optional, for direct import)
LABS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../labs'))

app = FastAPI(title="Student Demo Backend")
print("INFO: Student Demo Backend Starting...", flush=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIG ---
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6380))
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:19092")
LABS_DIR = os.getenv("LABS_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), '../../labs')))

# --- CLIENTS ---
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# --- ROUTES ---

@app.get("/")
def root():
    return {"status": "ok", "labs_dir": LABS_DIR}

@app.get("/labs/{lab_id}/code")
def get_lab_code(lab_id: str):
    """Reads the source code of a lab artifact."""
    # Mapping lab_id to folder/file
    mapping = {
        "01": ("01_cicd", "bot.py"),
        "02": ("02_docker", "Dockerfile"),
        "04": ("04_redis", "tape_reader.py"),
        "05": ("05_algo", "trader.py"),
        "06": ("06_glass", "Blotter.tsx"),
        "07": ("07_audit", "archiver.py"),
        "08": ("08_brain", "analyst.py"),
        "09": ("09_rag", "rag_analyst.py"),
        "10": ("10_fund", "fund.py"),
        "11": ("11_cloud", "autoscale.py"),
        "12": ("12_desktop", "TraderDesktop.tsx"),
        "13": ("13_green_hornet", "projects.md"),
        "14a": ("14_legacy", "leaky_bucket.py"),
        "14b": ("14_legacy", "PhantomOrderBook.java"),
        "14c": ("14_legacy", "slow_vwap.py"),
        "14d": ("14_legacy", "BrokenLedger.java"),
        "14e": ("14_legacy", "LazyDashboard.tsx"),
    }
    
    if lab_id not in mapping:
        return {"error": "Lab not found"}
        
    folder, filename = mapping[lab_id]
    path = os.path.join(LABS_DIR, folder, filename)
    
    try:
        with open(path, "r") as f:
            content = f.read()
        return {"code": content, "filename": filename}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/orders")
async def get_orders():
    """Fetch all known orders from Redis Snapshot (ECN/Exchange Source)."""
    try:
        order_ids = await r.smembers("orders:all")
        if not order_ids:
            return []
            
        orders = []
        async with r.pipeline() as pipe:
            for oid in order_ids:
                pipe.hgetall(f"order:{oid}")
            results = await pipe.execute()
        
        for i, data in enumerate(results):
            if data:
                # Ensure fields match Blotter expectations
                # ECN stores 'Status', Blotter expects 'OrdStatus'
                if 'OrdStatus' not in data and 'Status' in data:
                    data['OrdStatus'] = data['Status']
                orders.append(data)
                
        # Sort by latest
        orders.sort(key=lambda x: x.get('TransactTime', ''), reverse=True)
        return orders
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return []

# --- WEBSOCKETS ---

@app.websocket("/ws/redis")
async def redis_proxy(websocket: WebSocket):
    """Proxies the Redis 'market_data' channel to the browser."""
    await websocket.accept()
    pubsub = r.pubsub()
    await pubsub.subscribe("market_data_updates", "updates:orders", "autoscale_metrics")
    
    try:
        while True:
            # Non-blocking get_message
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                try:
                    data = json.loads(message['data'])
                    await websocket.send_json(data)
                except:
                    pass
            await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        await pubsub.unsubscribe()
    except Exception as e:
        print(f"Redis WS Error: {e}")

@app.websocket("/ws/redpanda")
async def redpanda_proxy(websocket: WebSocket):
    """Proxies Redpanda 'execution_reports' to the browser."""
    await websocket.accept()
    
    # Run consumer in a separate thread because confluent-kafka is blocking/sync
    # For this simple demo, we'll try a polling loop within asyncio
    # Ideally, we should use aiokafka, but we'll stick to the lab dependencies if possible
    # Actually, let's use a simple polling approach here.
    
    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'group.id': 'demo_viewer_' + str(os.getpid()),
        'auto.offset.reset': 'latest'
    }
    
    consumer = Consumer(conf)
    consumer.subscribe(['execution_reports'])
    
    try:
        while True:
            # We must not block the loop
            # Provide a very short timeout to poll()
            msg = consumer.poll(0.01) 
            
            if msg is None:
                await asyncio.sleep(0.01)
                continue
                
            if not msg.error():
                val = msg.value().decode('utf-8')
                await websocket.send_text(val)
                
            await asyncio.sleep(0) # Yield
            
    except WebSocketDisconnect:
        consumer.close()
    except Exception as e:
        print(f"Redpanda WS Error: {e}")
        consumer.close()

# --- SCRIPT RUNNER ---

# Global state for running scripts
# Key: lab_id, Value: subprocess.Popen
active_processes = {}
process_lock = threading.Lock()
# --- BROADCAST MANAGER ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # iterate copy to avoid modification during iteration
        for connection in self.active_connections[:]:
            try:
                await connection.send_text(message)
            except Exception:
                # If send fails, we might want to remove, but disconnect handler usually does it
                pass

manager = ConnectionManager()

# Bridge between Synchronous Threads and Async Broadcast
# Threads put messages here; Async loop broadcasts them
log_queue = queue.Queue()

def read_stream(stream, prefix):
    for line in iter(stream.readline, ''):
        try:
            # We need to get this into the async loop. 
            # Since we can't await here, we rely on the janitor loop below.
            # But wait, asyncio.Queue is not thread-safe for put() from another thread without loop.call_soon?
            # Actually, Janus is better, but let's stick to simple thread-safe Queue + Janitor configuration.
            log_queue.put(f"{prefix}: {line.strip()}")
        except Exception:
            pass
    stream.close()

@app.get("/labs/{lab_id}/status")
def get_lab_status(lab_id: str):
    """Checks if the lab script is currently running."""
    with process_lock:
        proc = active_processes.get(lab_id)
        is_running = proc is not None and proc.poll() is None
        # Cleanup if dead
        if proc and not is_running:
            del active_processes[lab_id]
            
        return {
            "status": "ok", 
            "running": is_running, 
            "pid": proc.pid if is_running else None
        }

@app.post("/labs/{lab_id}/start")
def start_lab(lab_id: str):
    with process_lock:
        # 1. Check if already running
        if lab_id in active_processes:
            proc = active_processes[lab_id]
            if proc.poll() is None:
                return {"status": "error", "message": f"Lab {lab_id} is already running"}
            else:
                # Cleanup dead process reference
                del active_processes[lab_id]

        # 2. Resolve Script Path
        mapping = {
            "05": ("05_algo", "trader.py"),
            "08": ("08_brain", "analyst.py"),
            "09": ("09_rag", "rag_analyst.py"),
            "10": ("10_fund", "fund.py"),
        }
        
        if lab_id not in mapping:
            return {"status": "error", "message": "Lab not executable"}
            
        folder, filename = mapping[lab_id]
        script_path = os.path.join(LABS_DIR, folder, filename)
        
        # 3. Start Process
        try:
            # Run in unbuffered mode to capture output immediately
            proc = subprocess.Popen(
                [sys.executable, "-u", script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.path.join(LABS_DIR, folder),
                env={**os.environ, "TRADING_SERVER_HOST": os.getenv("TRADING_SERVER_HOST", "localhost")}
            )
            
            # Store process
            active_processes[lab_id] = proc
            
            # Start Logging Threads with specialized prefix for UI to filter if needed
            # For now, we prepend [Lab XX] so the single log stream is readable
            prefix = f"[Lab {lab_id}]"
            threading.Thread(target=read_stream, args=(proc.stdout, f"{prefix} INFO"), daemon=True).start()
            threading.Thread(target=read_stream, args=(proc.stderr, f"{prefix} ERROR"), daemon=True).start()
            
            return {"status": "ok", "pid": proc.pid}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}

@app.post("/labs/{lab_id}/stop")
def stop_lab(lab_id: str):
    with process_lock:
        if lab_id not in active_processes:
             return {"status": "ok", "message": "No process running"}
             
        proc = active_processes[lab_id]
        
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
        
        del active_processes[lab_id]
        log_queue.put(f"SYSTEM: Lab {lab_id} stopped.")
        return {"status": "ok", "message": "Stopped"}

# Start a background task to pump messages from thread-safe Queue to WebSockets
async def log_broadcaster():
    while True:
        try:
            # Non-blocking check to allow sleep
            # We check the synchronous queue
            try:
                line = log_queue.get(block=False)
                await manager.broadcast(line)
            except queue.Empty:
                await asyncio.sleep(0.01)
        except Exception as e:
            print(f"Broadcaster Error: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(log_broadcaster())

@app.websocket("/ws/logs")
async def log_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and wait for disconnect
            # The broadcasting happens in the background task pushing TO this socket
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)

        await manager.disconnect(websocket)

# --- DOCKER API ---

@app.get("/api/docker/containers")
def get_docker_containers():
    """Returns list of active containers with stats."""
    try:
        client = docker.from_env()
        containers = []
        for c in client.containers.list(all=True):
            # Basic info
            try:
                # Docker object attributes might vary, handle gracefully
                name = c.name
                status = c.status
                state = c.attrs.get('State', {}).get('Status', 'unknown')
                image_tags = c.image.tags if c.image and c.image.tags else [c.attrs.get('Config', {}).get('Image', 'unknown')]
                image = image_tags[0] if image_tags else "unknown"
                ports = c.attrs.get('NetworkSettings', {}).get('Ports', {})
                labels = c.labels
                short_id = c.short_id
                
                # Mock stats for "Real-time" feel if actual stats are too slow to fetch synchronously
                # (Fetching stats for all containers takes time)
                # In a real heavy app, we'd use a background thread to cache stats.
                # For this demo, let's just return the metadata.
                
                containers.append({
                    "id": short_id,
                    "name": name,
                    "image": image,
                    "status": status,
                    "state": state,
                    "ports": ports,
                    "labels": labels
                })
            except Exception as e:
                print(f"Error parsing container {c.name}: {e}")
                continue
            
        return containers
    except Exception as e:
        print(f"Docker API Error: {e}")
        return {"error": str(e)}

@app.post("/api/stress/trigger")
async def trigger_stress(background_tasks: BackgroundTasks):
    """Generates a burst of Redis traffic to trigger autoscaling."""
    def _generate_traffic():
        # High intensity burst
        for i in range(2000):
            r.publish("stress_test", f"load_test_msg_{i}")
            
    background_tasks.add_task(_generate_traffic)
    print("WARNING: Stress test initiated", flush=True)
    return {"status": "Stress test initiated", "message_count": 2000}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
