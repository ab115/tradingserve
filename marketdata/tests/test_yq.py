from yahooquery import Ticker
import time

def test_yq():
    print("Testing yahooquery...")
    try:
        t = Ticker("AAPL")
        print("Fetching price...")
        start = time.time()
        price = t.price
        print(f"Result: {price}")
        print(f"Time taken: {time.time() - start:.2f}s")
    except Exception as e:
        print(f"Yahooquery failed: {e}")

if __name__ == "__main__":
    test_yq()
