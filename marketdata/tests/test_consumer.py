import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from kafka import KafkaConsumer
import json
from config import REDPANDA_BROKER, MARKET_DATA_TOPIC

def test_consumer():
    print(f"Connecting to Redpanda at {REDPANDA_BROKER} topic '{MARKET_DATA_TOPIC}'...")
    try:
        consumer = KafkaConsumer(
            MARKET_DATA_TOPIC,
            bootstrap_servers=REDPANDA_BROKER,
            auto_offset_reset='latest',
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            consumer_timeout_ms=10000 # Stop after 10s
        )

        for message in consumer:
            print(f"Received from Redpanda: {len(message.value)} updates")
            print(message.value[:2])
            break # Success
            
        print("Consumer test finished.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_consumer()
