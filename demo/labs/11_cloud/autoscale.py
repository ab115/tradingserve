import time
import random

# Lab 11: The Cloud Native (Auto-Scaling)
# Objective: Master Elasticity.

def get_market_volatility():
    # Simulates reading a metric from Prometheus/App
    return random.randint(0, 100)

def simulate_scaling():
    current_replicas = 1
    print("☁️ Auto-Scaler Service Started. Monitoring Volatility...")

    while True:
        volatility = get_market_volatility()
        target_replicas = 1
        
        if volatility > 80:
            target_replicas = 5
            status = "🚨 HIGH VOLATILITY"
        elif volatility > 50:
            target_replicas = 3
            status = "⚠️ MODERATE VOLATILITY"
        else:
            status = "✅ STABLE MARKET"
            
        print(f"Metric: {volatility} | Status: {status}")

        if target_replicas != current_replicas:
            print(f"🔄 SCALING ACTION: {current_replicas} -> {target_replicas} replicas")
            # In real lab: subprocess.run(f"docker compose up -d --scale bot={target_replicas}")
            current_replicas = target_replicas
            
        time.sleep(2)

if __name__ == "__main__":
    simulate_scaling()
