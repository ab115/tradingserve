import requests
import time
import random
import os

# Lab 5: The Algo Trader
# Objective: Build an automated Trading Client.

HOST = os.getenv("TRADING_SERVER_HOST", "localhost")
PORT = os.getenv("TRADING_SERVER_PORT", "8010")
API_URL = f"http://{HOST}:{PORT}"

def get_price(symbol):
    # Simulating a snapshot fetch
    # In reality: requests.get(f"{API_URL}/marketdata/api/book/{symbol}")
    return 150.0 + random.uniform(-1, 1)

def place_order(symbol, side, qty, price):
    payload = {
        "symbol": symbol,
        "side": side,
        "qty": qty,
        "price": price,
        "type": "LIMIT"
    }
    try:
        # Direct call to ecn-api container on internal port 8000
        res = requests.post(f"{API_URL}/orders", json=payload)
        if res.status_code == 200:
            print(f"✅ Order Placed: {side} {qty} {symbol} @ {price:.2f}")
        else:
            print(f"❌ Order Failed: {res.text}")
    except Exception as e:
        print(f"Connection Error: {e}")

def strategy():
    symbol = "AAPL"
    print(f"🤖 Algo Bot Started for {symbol}...")
    
    while True:
        price = get_price(symbol)
        print(f"👀 Watching {symbol}: ${price:.2f}")
        
        if price < 149.50:
            print("📉 Price Drop Detected! BUYING!")
            place_order(symbol, "BUY", 100, price)
        elif price > 150.50:
             print("📈 Price Spike! SELLING!")
             place_order(symbol, "SELL", 100, price)
             
        time.sleep(2)

if __name__ == "__main__":
    strategy()
