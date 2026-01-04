from yahooquery import Ticker
import json
import datetime

def debug_news():
    t = Ticker("AAPL")
    try:
        news = t.news
        print(f"Type of news: {type(news)}")
        if isinstance(news, list):
            print(f"Length: {len(news)}")
            if news:
                first = news[0]
                print(f"First item keys: {first.keys()}")
                print("First item values types:")
                for k, v in first.items():
                    print(f"  {k}: {type(v)} - {v}")
                    
                # Try simple dumps
                try:
                    print("\nTrying raw json.dumps...")
                    print(json.dumps(first))
                except Exception as e:
                    print(f"JSON Dump failed: {e}")
        else:
            print(f"News is not a list: {news}")
            
    except Exception as e:
        print(f"Error accessing news: {e}")

if __name__ == "__main__":
    debug_news()
