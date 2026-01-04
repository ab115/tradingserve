import yfinance as yf
import json

def debug_news():
    ticker = "AAPL"
    try:
        t = yf.Ticker(ticker)
        news = t.news
        if news:
            print(f"Found {len(news)} items.")
            print("First item keys:", news[0].keys())
            print("First item full dump:")
            print(json.dumps(news[0], default=str, indent=2))
        else:
            print("No news found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_news()
