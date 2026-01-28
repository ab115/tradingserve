import subprocess
import time
import random

# autoscale_bot.py
# Simulates an Auto-Scaler Service that monitors load and scales the 'bot' service.

def get_market_volatility():
    """
    Simulates fetching a metric from the Exchange or an internal queue.
    Returns a value between 0 and 100.
    """
    # In real life, query http://localhost/marketdata/api/volatility
    # For this lab, we mock it.
    metric = random.randint(0, 100)
    return metric

def scale_bots(replicas):
    """
    Calls docker compose to scale the bot service.
    """
    print(f"⚡ Scaling 'bot' service to {replicas} replicas...")
    try:
        # Assuming running in the directory with docker-compose.yml
        subprocess.run(f"docker compose up -d --scale bot={replicas} --no-recreate", shell=True, check=True)
        print("✅ Scaling command sent.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error scaling: {e}")

def main():
    print("🤖 Auto-Scaler Engine Started...")
    print("Monitoring 'Market Volatility' metric every 5 seconds...")
    
    current_state = "NORMAL"
    
    try:
        while True:
            vol = get_market_volatility()
            print(f"📊 Current Volatility Metric: {vol}/100")
            
            # Control Loop Logic
            if vol > 80 and current_state != "HIGH":
                print("🚨 SURGE DETECTED! Initiating scale-out...")
                scale_bots(5)
                current_state = "HIGH"
                
            elif vol < 40 and current_state != "NORMAL":
                print("📉 Market calming down. Scaling back...")
                scale_bots(1)
                current_state = "NORMAL"
            
            # Wait for next poll cycle
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n🛑 Auto-Scaler stopped.")

if __name__ == "__main__":
    main()
