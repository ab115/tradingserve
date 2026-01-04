import asyncio
import json
import logging
import websockets

async def test_websocket():
    uri = "ws://localhost:9001/ws/marketdata"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            # Receive multiple individual messages
            count = 0
            print("Waiting for 5 individual updates...")
            while count < 5:
                msg = await websocket.recv()
                data = json.loads(msg)
                print(f"Received: {data}")
                count += 1
            print("Verified individual streaming.")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
