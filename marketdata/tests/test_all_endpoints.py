import asyncio
import websockets
import json
import time

async def test_market_data():
    uri = "ws://localhost:9001/ws/marketdata"
    print(f"\n[Market Data] Connecting to {uri}...")
    try:
        async with websockets.connect(uri, ping_interval=None, open_timeout=20) as websocket:
            print("[Market Data] Connected. Waiting for messages...")
            for i in range(3):
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(msg)
                    print(f"[Market Data] Received: {data.get('ticker')} - {data.get('price')}")
                except asyncio.TimeoutError:
                    print("[Market Data] Timeout waiting for message.")
                    break
    except Exception as e:
        print(f"[Market Data] Connection Failed: {e}")

async def test_news(ticker="AAPL"):
    uri = f"ws://localhost:9001/ws/news/{ticker}"
    print(f"\n[News] Connecting to {uri}...")
    try:
        async with websockets.connect(uri, ping_interval=None, open_timeout=20) as websocket:
            print("[News] Connected. Waiting for data...")
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=20.0)
                data = json.loads(msg)
                print(f"[News] Type: {type(data)}")
                if isinstance(data, list):
                    print(f"[News] Item count: {len(data)}")
                    if data:
                        print(f"[News] First Headline: {data[0].get('title', 'N/A')}")
                else:
                    print(f"[News] Raw Data: {data}")
            except asyncio.TimeoutError:
                print("[News] Timeout waiting for data.")
    except Exception as e:
        print(f"[News] Connection Failed: {e}")

async def test_sector(ticker="AAPL"):
    uri = f"ws://localhost:9001/ws/sector/{ticker}"
    print(f"\n[Sector] Connecting to {uri}...")
    try:
        async with websockets.connect(uri, ping_interval=None, open_timeout=20) as websocket:
            print("[Sector] Connected. Waiting for data...")
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=20.0)
                data = json.loads(msg)
                print(f"[Sector] Sector: {data.get('sector', 'N/A')}")
                print(f"[Sector] Industry: {data.get('industry', 'N/A')}")
            except asyncio.TimeoutError:
                print("[Sector] Timeout waiting for data.")
    except Exception as e:
        print(f"[Sector] Connection Failed: {e}")

async def main():
    print("Starting Comprehensive API Test...")
    await test_market_data()
    await test_news()
    await test_sector()
    print("\nTest Complete.")

if __name__ == "__main__":
    asyncio.run(main())
