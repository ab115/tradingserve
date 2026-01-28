from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import signal
import sys
import psutil
from pydantic import BaseModel

app = FastAPI(title="Trading Demo Controller")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Simulation Process
sim_process = None

@app.get("/status")
def get_status():
    global sim_process
    is_running = False
    if sim_process:
        if sim_process.poll() is None:
            is_running = True
        else:
            sim_process = None # Cleanup
    return {"simulation_running": is_running}

@app.post("/simulation/start")
def start_simulation(duration: int = 300):
    global sim_process
    
    # Check if running
    if sim_process and sim_process.poll() is None:
        return {"status": "already_running"}
    
    try:
        # Path to ECN Gateway Tests (mounted via Docker)
        cwd = "/app/ecngateway/tests"
        if not os.path.exists(cwd):
             # Fallback for local env dev
             cwd = "../../ecngateway/tests"
             
        # Command: python test_realtime_simulation.py
        # We assume dependencies (quickfix) are installed in this container
        cmd = ["python", "test_realtime_simulation.py"]
        
        # Launch
        # Note: we need to ensure stdout/stderr don't buffer too much or block
        sim_process = subprocess.Popen(
            cmd, 
            cwd=cwd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        return {"status": "started", "pid": sim_process.pid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulation/stop")
def stop_simulation():
    global sim_process
    if sim_process:
        # Kill process tree to be safe
        try:
            parent = psutil.Process(sim_process.pid)
            for child in parent.children(recursive=True):
                child.terminate()
            parent.terminate()
            sim_process = None
            return {"status": "stopped"}
        except psutil.NoSuchProcess:
            sim_process = None
            return {"status": "already_stopped", "detail": "Process died unexpectedly"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"status": "not_running"}

@app.get("/logs")
def get_logs(lines: int = 50):
    """Peek at the latest logs (if we were redirecting to file, but for now just basic stub)."""
    return {"logs": ["Log streaming not implemented in simple mode yet."]}

class TradeRequest(BaseModel):
    symbol: str
    side: str
    qty: float
    type: str # Market/Limit
    price: float = 0.0

@app.post("/trade")
def inject_trade(trade: TradeRequest):
    try:
        # Run single_order.py
        cmd = [
            "python", "backend/single_order.py",
            "--symbol", trade.symbol,
            "--side", trade.side,
            "--qty", str(trade.qty),
            "--type", trade.type,
            "--price", str(trade.price),
            # Point to the mounted config
            "--cfg", "/app/ecngateway/tests/client.cfg"
        ]
        
        # We run from /app so backend/single_order.py is correct relative path?
        # Dockerfile Workdir is /app.
        # Structure: /app/backend/main.py, /app/backend/single_order.py
        # If we run "python backend/single_order.py" it should work.
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app")
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Script failed: {result.stderr}")
            
        return {"status": "sent", "output": result.stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
