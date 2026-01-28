# Level 3: The Tape Reader (Redis)

> **Job Track**: 💾 Data Engineer

## Objective
**Tap into the raw data feed using Redis.**
The Exchange broadcasts every price ticking on a public Redis Channel. You will build a "Tape Reader" client to subscribe and print these ticks in real-time.

## 🎯 Skills Learned
- `Redis CLI`
- `Pub/Sub Architecture`
- `Key-Value Stores`
- `Real-time Data Streams`

## The Mission
You need the fastest possible price feed. The Web UI is too slow. You will connect directly to the Redis port (6379) exposed by the server.

## Lab Instructions

### Step 1: Install Redis Tools
- Windows: `choco install redis-64`
- Mac/Linux: `brew install redis` or `apt install redis-tools`
- Or use Python: `pip install redis`

### Step 2: Connect from Terminal
```bash
redis-cli -h <SERVER_IP> -p 6379
> PING
PONG
```

### Step 3: Subscribe to the Feed
```bash
> SUBSCRIBE market_data
```
Keep this running. Request a "Simulation Start" from the Web Portal. You should see JSON messages flying by:
`{"symbol": "AAPL", "price": 150.23, "ts": 16789...}`

### Challenge
Write a Python script `tape_reader.py`:
1. Connects to Redis.
2. Subscribes to `market_data`.
3. Prints **only** AAPL trades > $150.

## Outcome
You bypassed the UI to get raw, low-latency data directly from the infrastructure.
