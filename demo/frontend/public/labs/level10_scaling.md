# Level 9: The Cloud Native (Auto-Scaling)

> **Job Track**: ☁️ Cloud Engineer

## Objective
**Master Elasticity.**
The Cloud isn't just about renting servers; it's about **Elasticity**. As a Cloud Engineer, you build systems that expand and contract like a living lung. We will simulate this locally using Docker.

## 🎯 Skills Learned
- `Cloud Native Architecture`
- `Horizontal Pod Autoscaling (HPA)`
- `Docker Compose Scaling`
- `Observability & Control Loops`

## The Mission
1. Run your bot in Docker Compose.
2. Simulate a "Surge" of signals.
3. Write a Python script that detects the surge and runs `docker compose up --scale bot=5`.

## Lab Instructions

### Step 1: Setup
Use the `docker-compose.yml` from Level 2.
Ensure your bot prints "Processing signal..." every time it trades.

### Step 2: The Metrics
Create a file `metrics.py` (or exposes a tiny flask endpoint in your bot) to output its queue depth.
*Simpler approach for this lab:* We will assume "Time of Day" or "Market Volatility" is the metric.

### Step 3: The Auto-Scaler Script
Create `autoscale_bot.py`:

```python
import subprocess
import time
import random

def get_market_volatility():
    # In real life, query the Exchange API.
    # Here, we simulate a "Surge"
    return random.randint(0, 100)

current_replicas = 1

while True:
    volatility = get_market_volatility()
    print(f"Volatility: {volatility}")
    
    target_replicas = 1
    if volatility > 80:
        target_replicas = 5
    elif volatility > 50:
        target_replicas = 3
        
    if target_replicas != current_replicas:
        print(f"Scaling to {target_replicas} replicas...")
        subprocess.run(f"docker compose up -d --scale bot={target_replicas}", shell=True)
        current_replicas = target_replicas
        
    time.sleep(5)
```

### Step 4: Watch it fly
1. Run `python autoscale_bot.py`.
2. Watch `docker compose ps` in another terminal.
3. See containers spin up and down automatically as the random number generator changes.

## Outcome
You implemented a **Control Loop**, the fundamental building block of Kubernetes and Cloud Auto-scaling.
