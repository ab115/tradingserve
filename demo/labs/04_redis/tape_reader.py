import redis
import json

import os

# Lab 4: The Tape Reader (Redis)
# Objective: Tap into the raw data feed using Redis.

def run_tape_reader():
    # Connect to Redis. Allow remote host configuration.
    host = os.getenv("TRADING_SERVER_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", 6380))
    
    r = redis.Redis(host=host, port=port, decode_responses=True)
    
    print("Connected to Redis. Subscribing to 'market_data_updates'...")
    pubsub = r.pubsub()
    pubsub.subscribe('market_data_updates')

    try:
        for message in pubsub.listen():
            if message['type'] == 'message':
                data = json.loads(message['data'])
                # Challenge: Print only AAPL trades > $150
                if data.get('symbol') == 'AAPL' and data.get('price') > 150:
                    print(f"💰 BIG TRADE: {data}")
    except KeyboardInterrupt:
        print("Stopping tape reader...")

if __name__ == "__main__":
    run_tape_reader()
