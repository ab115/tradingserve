# Level 4: The Algo Trader (REST & WebSocket)

> **Job Track**: ⚡ Quantitative Developer

## Objective
**Build an automated Trading Client.**
You will write a script that connects to the Exchange's API to make trading decisions automatically.

## 🎯 Skills Learned
- `REST API Polling`
- `WebSocket Streaming`
- `Python Requests`
- `AsyncIO / Await`

## The Mission
Your strategy is simple: "Buy low, Sell high".
1.  **Poll** the Snapshot (REST) to find a starting price.
2.  **Listen** to the Stream (WebSocket) for updates.
3.  **Execute** an Order (REST) when the price drops.

## Lab Instructions

### Step 1: Get the Snapshot (REST)
Endpoint: `GET http://<SERVER_IP>/marketdata/api/book/AAPL`
Response: `{"bids": [...], "asks": [...]}`

```python
import requests
res = requests.get("http://<SERVER_IP>/marketdata/api/book/AAPL")
print(res.json())
```

### Step 2: Listen to Stream (WebSocket)
Endpoint: `ws://<SERVER_IP>/marketdata/ws/level1`

```python
import websockets, asyncio

async def listen():
    async with websockets.connect("ws://<SERVER_IP>/marketdata/ws/level1") as ws:
        while True:
            msg = await ws.recv()
            print(f"Update: {msg}")

asyncio.run(listen())
```

### Step 3: Execute Order (REST)
Endpoint: `POST http://<SERVER_IP>/ecn/api/orders`
Payload: `{"symbol": "AAPL", "side": "BUY", "qty": 100, "price": 149.00}`

## Outcome
You have built a fully functional Algo Trader running on your machine, interacting with the remote exchange.
