import asyncio
import websockets
import json

async def test_news():
    uri = "ws://localhost:9001/ws/news/AAPL"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to News API!")
            msg = await websocket.recv()
            data = json.loads(msg)
            print(f"Received News: {len(data)} items")
            if data:
                print(f"Latest Headline: {data[0].get('title', 'N/A')}")
    except Exception as e:
        print(f"News Test Failed: {e}")

async def test_sector():
    uri = "ws://localhost:9001/ws/sector/AAPL"
    print(f"\nConnecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to Sector API!")
            msg = await websocket.recv()
            data = json.loads(msg)
            print(f"Received Sector Data for {data.get('symbol', 'Unknown')}")
            print(f"Sector: {data.get('sector', 'N/A')}, Industry: {data.get('industry', 'N/A')}")
    except Exception as e:
        print(f"Sector Test Failed: {e}")

async def main():
    await test_news()
    await test_sector()

if __name__ == "__main__":
    asyncio.run(main())
