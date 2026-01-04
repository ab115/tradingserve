from yahooquery import Ticker
import json
import datetime

def debug_news_data():
    t = Ticker("AAPL")
    try:
        print("--- Testing yahooquery ---")
        # Handle method vs property
        data = t.news
        if callable(data):
            data = data()
            
        if isinstance(data, list) and data:
            print(f"Found {len(data)} items.")
            first = data[0]
            
            if isinstance(first, dict):
                print(json.dumps(first, indent=2))
                ts = first.get('providerPublishTime')
                print(f"\nproviderPublishTime: {ts} (Type: {type(ts)})")
            else:
                print(f"Item is not a dict: {first}")
        else:
            print("No news found or data not a list.")
            
    except Exception as e:
        print(f"Error accessing yahooquery news: {e}")

    print("\n--- Testing yfinance (Backend Implementation) ---")
    try:
        import yfinance as yf
        stock = yf.Ticker("AAPL")
        news = stock.news
        if news and isinstance(news, list) and len(news) > 0:
             print(f"Found {len(news)} items.")
             print(json.dumps(news[0], indent=2))
        else:
             print("No news found via yfinance.")
    except Exception as e:
        print(f"Error accessing yfinance news: {e}")

if __name__ == "__main__":
    debug_news_data()
