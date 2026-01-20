import multiprocessing
import uvicorn
import os
import time
from tradingserver_core.service_host import ServiceHost 

# Launcher script to run both Worker and API in single container (Hybrid Mode)
# For production scalable mode, run 'worker.py' and 'api.py' separately.

def run_worker():
    # Because worker.py uses async and ServiceHost, we can just import and run its main?
    # Or cleaner to run it as a subprocess command.
    os.system("python worker.py")

def run_api():
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False) # Reload false in hybrid

if __name__ == "__main__":
    print("Starting Market Maker (Hybrid Mode)...")
    
    # Start Worker Process
    p_worker = multiprocessing.Process(target=run_worker)
    p_worker.start()
    
    # Start API (in main process)
    try:
        run_api()
    except KeyboardInterrupt:
        print("Stopping...")
        p_worker.terminate()
        p_worker.join()
