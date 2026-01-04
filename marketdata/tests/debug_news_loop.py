from yahooquery import Ticker
import time
import json

def debug_loop():
    ticker = "AAPL"
    print(f"Fetching news for {ticker} 3 times...")
    
    for i in range(3):
        print(f"\n--- Attempt {i+1} ---")
        try:
            t = Ticker(ticker)
            # Access property
            data = t.news
            print(f"Raw type: {type(data)}")
            
            # Callable check
            if callable(data):
                print("Data is callable, invoking...")
                data = data()
                
            if isinstance(data, list):
                print(f"Got list of length {len(data)}")
                if data:
                    print(f"First item type: {type(data[0])}")
                    if isinstance(data[0], dict):
                         print(f"First Title: {data[0].get('title', 'N/A')}")
            else:
                print(f"Got non-list: {data}")
                
        except Exception as e:
            print(f"Exception: {e}")
            
        time.sleep(2)

if __name__ == "__main__":
    debug_loop()
