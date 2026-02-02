from confluent_kafka import Consumer
import json
import os

# Lab 7: The Audit Log (Redpanda)
# Objective: Establish a "Drop Copy" Compliance Feed.

def run_archiver():
    host = os.getenv("TRADING_SERVER_HOST", "localhost")
    conf = {
        'bootstrap.servers': f'{host}:19092', # External port
        'group.id': 'compliance_archiver',
        'auto.offset.reset': 'earliest'
    }

    consumer = Consumer(conf)
    consumer.subscribe(['execution_reports'])
    
    print("🛡️ Compliance Archiver Running...")
    print("Listening to topic: 'execution_reports'")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None: continue
            if msg.error():
                print("Consumer error: {}".format(msg.error()))
                continue

            trade_data = msg.value().decode('utf-8')
            print(f"📝 Archiving: {trade_data}")
            
            # In a real lab, valid JSON would be appended to a file
            # with open('trade_archive.log', 'a') as f:
            #    f.write(trade_data + "\n")
            
    except KeyboardInterrupt:
        print("Stopping archiver...")
    finally:
        consumer.close()

if __name__ == "__main__":
    run_archiver()
