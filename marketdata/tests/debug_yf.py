import yfinance as yf
import time

def test_fetch():
    print("Attempting to fetch 'AAPL'...")
    start = time.time()
    try:
        # Try a single ticker, explicit session=None to use default
        dat = yf.Ticker("AAPL")
        price = dat.fast_info.last_price
        print(f"Success! Price: {price}")
    except Exception as e:
        print(f"Failed Ticker method: {e}")
        
    try:
        print("Attempting download 'AAPL'...")
        data = yf.download("AAPL", period="1d", interval="1m", progress=True, threads=False)
        print("Download result:")
        print(data)
    except Exception as e:
        print(f"Failed download method: {e}")
        
    print(f"Time taken: {time.time() - start:.2f}s")

if __name__ == "__main__":
    test_fetch()
