from yahooquery import Ticker
import json

def test_features():
    t = Ticker("AAPL")
    
    print("--- News ---")
    try:
        news = t.news
        print(json.dumps(news[:2], indent=2) if news else "No news found")
    except Exception as e:
        print(f"News error: {e}")
        
    print("\n--- Profile (Sector) ---")
    try:
        profile = t.asset_profile
        print(json.dumps(profile, indent=2) if profile else "No profile found")
    except Exception as e:
        print(f"Profile error: {e}")

if __name__ == "__main__":
    test_features()
