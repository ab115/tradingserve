# Level 6: The Audit Log (Redpanda Streaming)

> **Job Track**: 🛡️ Compliance Engineer

## Objective
**Establish a "Drop Copy" Compliance Feed.**
For every trade executed on the exchange, a copy is dropped onto a **Redpanda** Topic (Kafka-compatible). You will build a Python Compliance Tool that listens to this topic to archive trades.

## 🎯 Skills Learned
- `Apache Kafka Protocol`
- `Redpanda Streaming`
- `Event Driven Architecture`
- `Data Archiving`

## The Mission
The Regulator requires a separate, read-only record of all trades. You cannot trust the REST API logs; you need the raw event stream. Redpanda provides a high-performance, crash-safe engine for this.

## Lab Instructions

### Step 1: Install Python Client
Since Redpanda is 100% compatible with the Apache Kafka® API, we use the standard, high-performance `confluent-kafka` library (based on `librdkafka`). **No Redpanda-specific client is needed.**

```bash
pip install confluent-kafka
```

### Step 2: Connect to Redpanda
The Server exposes Redpanda on Port `19092`.

```python
from confluent_kafka import Consumer

conf = {
    'bootstrap.servers': '<SERVER_IP>:19092',
    'group.id': 'compliance_archiver',
    'auto.offset.reset': 'earliest'
}

consumer = Consumer(conf)
consumer.subscribe(['execution_reports'])
```

### Step 3: Archive the Data
Write a loop that writes every message to a local file `trade_archive.log`.

```python
with open('trade_archive.log', 'w') as f:
    while True:
        msg = consumer.poll(1.0)
        if msg is None: continue
        
        trade_data = msg.value().decode('utf-8')
        print(f"Archiving: {trade_data}")
        f.write(trade_data + "\n")
```

### Challenge
Run the "Market Crash" simulation on the Server. Does your archiver keep up with the burst of traffic?

## Outcome
You learned how to consume high-throughput event streams for backend processing.
