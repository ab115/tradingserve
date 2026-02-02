from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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

# Add labs path to sys.path to allow execution of student scripts (optional, for direct import)
LABS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../labs'))

app = FastAPI(title="Student Demo Backend")

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

# --- WEBSOCKETS ---

@app.websocket("/ws/redis")
async def redis_proxy(websocket: WebSocket):
    """Proxies the Redis 'market_data' channel to the browser."""
    await websocket.accept()
    pubsub = r.pubsub()
    await pubsub.subscribe("market_data_updates", "updates:orders")
    
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

# Global state for the running script
running_process = None
log_queue = queue.Queue()

def read_stream(stream, prefix):
    for line in iter(stream.readline, ''):
        log_queue.put(f"{prefix}: {line.strip()}")
    stream.close()

@app.get("/labs/{lab_id}/status")
def get_lab_status(lab_id: str):
    """Checks if the lab script is currently running."""
    global running_process
    is_running = running_process is not None and running_process.poll() is None
    return {"status": "ok", "running": is_running, "pid": running_process.pid if is_running else None}

@app.post("/labs/{lab_id}/start")
def start_lab(lab_id: str):
    global running_process
    
    if running_process and running_process.poll() is None:
        return {"status": "error", "message": "Script already running"}

    # Mapping lab_id to script
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
    
    # Run in unbuffered mode to capture output immediately
    running_process = subprocess.Popen(
        [sys.executable, "-u", script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=os.path.join(LABS_DIR, folder), # Set CWD so imports work if any
        env={**os.environ, "TRADING_SERVER_HOST": os.getenv("TRADING_SERVER_HOST", "localhost")}
    )
    
    # Start threads to read stdout/stderr
    threading.Thread(target=read_stream, args=(running_process.stdout, "INFO"), daemon=True).start()
    threading.Thread(target=read_stream, args=(running_process.stderr, "ERROR"), daemon=True).start()
    
    return {"status": "ok", "pid": running_process.pid}

@app.post("/labs/{lab_id}/stop")
def stop_lab(lab_id: str):
    global running_process
    if running_process and running_process.poll() is None:
        running_process.terminate()
        try:
            running_process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            running_process.kill()
        running_process = None
        log_queue.put("SYSTEM: Process stopped.")
        return {"status": "ok", "message": "Stopped"}
    return {"status": "ok", "message": "No process running"}

@app.websocket("/ws/logs")
async def log_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                # Non-blocking get from queue
                line = log_queue.get_nowait()
                await websocket.send_text(line)
            except queue.Empty:
                await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
