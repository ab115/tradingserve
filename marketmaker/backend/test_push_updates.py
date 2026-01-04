import asyncio
import websockets
import httpx
import json

async def test_push_update():
    # Internal port inside the container is 8001 (default) or env variable PORT
    port = 8001 
    uri = f"ws://localhost:{port}/ws"
    api_url = f"http://localhost:{port}/positions/update"
    ticker = "AAPL"
    
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket")
        
        # 1. Listen for initial state
        initial_msg = await websocket.recv()
        print("Received initial state")
        
        # 2. Trigger an update via REST
        import random
        new_qty = random.randint(100, 1000)
        print(f"Sending REST update for {ticker} -> Quantity: {new_qty}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(api_url, json={
                "ticker": ticker,
                "quantity_change": 10,
                "price": 150.0 
            })
            if response.status_code != 200:
                print(f"REST Update Failed: {response.text}")
                return

        print("REST update sent. Waiting for WebSocket push...")
        
        # 3. Wait for the push message
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            
            # Find the updated ticker
            updated_pos = next((p for p in data if p['ticker'] == ticker), None)
            
            if updated_pos:
                # Note: The test sends quantity_change=10, so expect quantity to increase by 10, not be new_qty
                # But here we just print it to see if we got *an* update.
                print(f"WebSocket received update for {ticker}. New Quantity: {updated_pos['quantity']}")
                print("SUCCESS: Push event received!")
            else:
                print("FAILURE: Ticker not found in update message")
                
        except asyncio.TimeoutError:
            print("FAILURE: Timed out waiting for WebSocket message")

if __name__ == "__main__":
    asyncio.run(test_push_update())
