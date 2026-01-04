import redis
import json
import os

r = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=int(os.getenv('REDIS_PORT', 6379)), decode_responses=True)
p = r.pubsub()
p.subscribe('market_data_updates')
print("Listening for 5 messages...")
count = 0
for msg in p.listen():
    if msg['type'] == 'message':
        print(msg['data'])
        count += 1
        if count >= 5:
            break
