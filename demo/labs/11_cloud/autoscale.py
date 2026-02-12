import time
import random
import os
import json
import redis

# Lab 11: The Cloud Native (Auto-Scaling)
# Objective: Master Elasticity.

# Redis Connection
# Redis Connection
# If running inside Docker (e.g. via backend), REDIS_HOST will be 'fintech_redis'
# If running on Host (student manual run), it defaults to localhost
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6380 if REDIS_HOST == "localhost" else 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def get_market_volatility():
    # Simulates reading a metric from Prometheus/App
    # Random walk to make it look smooth
    return random.randint(0, 100)

import threading

# Global Traffic Counter
traffic_counter = 0
lock = threading.Lock()

def monitor_traffic():
    """Listens to all Redis channels to measure system activity."""
    global traffic_counter
    pubsub = r.pubsub()
    pubsub.psubscribe('*')  # Listen to everything
    
    print("🎧 Monitoring System Traffic...", flush=True)
    
    for message in pubsub.listen():
        if message['type'] == 'pmessage':
            channel = message['channel']
            # Ignore our own metrics to prevent feedback loops
            if channel != "autoscale_metrics":
                with lock:
                    traffic_counter += 1

def simulate_scaling():
    global traffic_counter
    current_replicas = 1
    
    # Start Traffic Monitor in background
    t = threading.Thread(target=monitor_traffic, daemon=True)
    t.start()
    
    print("☁️ Auto-Scaler Service Started. syncing with Lab Activity...", flush=True)

    # Baseline "noise" to keep stats alive even if idle
    baseline_noise = 5 
    cooldown_counter = 0
    COOLDOWN_CYCLES = 10 # 10 seconds of stability after a burst
    
    while True:
        try:
            # 1. Read and Reset Traffic Counter (Rate Calculation)
            with lock:
                actual_traffic = traffic_counter
                traffic_counter = 0
            
            # Normalize traffic to 0-100 scale for "Volatility"
            # Assume 50 msg/sec is 100% load
            msgs_per_sec = actual_traffic + baseline_noise + random.randint(0, 5)
            volatility = min(100, int((msgs_per_sec / 50) * 100))
            
            # 2. Determine Scaling Target
            target_replicas = 1
            if volatility > 80:
                target_replicas = 5
                status = "🚨 HIGH TRAFFIC"
                color = "red"
                cooldown_counter = COOLDOWN_CYCLES # Reset cooldown on high load
            elif volatility > 40:
                target_replicas = 3
                status = "⚠️ MODERATE LOAD"
                color = "orange"
                cooldown_counter = COOLDOWN_CYCLES # Reset cooldown on moderate load
            else:
                # 3. Apply Cooldown Logic
                if cooldown_counter > 0:
                    status = f"❄️ COOLING DOWN ({cooldown_counter}s)"
                    color = "blue"
                    target_replicas = current_replicas # Maintain current state
                    cooldown_counter -= 1
                else:
                    status = "✅ STABLE"
                    color = "green"
                    target_replicas = 1

            # 4. Simulate Spin up/down delay
            if target_replicas != current_replicas:
                # Immediate Scale Up, Slow Scale Down?
                # Actually, cooldown logic handles the "Slow Scale Down" by delaying it.
                # So we can just set current = target here.
                
                print(f"🔄 SCALING: {current_replicas} -> {target_replicas} (Load: {volatility}%)", flush=True)
                current_replicas = target_replicas

            # 5. Publish Telemetry
            payload = {
                "volatility": volatility,
                "mps": msgs_per_sec,
                "replicas": current_replicas,
                "status": status,
                "color": color,
                "threshold_high": 80,
                "threshold_mid": 40
            }
            r.publish("autoscale_metrics", json.dumps(payload))
            
        except Exception as e:
            print(f"Error: {e}", flush=True)

        time.sleep(1)

if __name__ == "__main__":
    simulate_scaling()
