
import redis
import sys

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
ticker = "ADANIENT.NS"
key = f"marketmaker:position:{ticker}"

if not r.exists(key):
    print(f"Key {key} does not exist.")
    sys.exit(1)

data = r.hgetall(key)
current_price = float(data.get('current_price', 0))
avg_price = float(data.get('avg_price', 0))

print(f"Ticker: {ticker}")
print(f"Current Price: {current_price}")
print(f"Avg Price: {avg_price}")

if current_price == 100.0:
    print("FAILURE: Price is still default 100.0")
    sys.exit(1)
elif current_price > 1000:
    print("SUCCESS: Price seems realistic (> 1000)")
else:
    print(f"WARNING: Price {current_price} is unexpected but not 100.0")
