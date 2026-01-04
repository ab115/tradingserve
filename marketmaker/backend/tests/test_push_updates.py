import asyncio
import websockets
import httpx
import json

async def test_push_update():
    uri = "ws://localhost:8002/ws"
    api_url = "http://localhost:8002/positions/update"
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
                "quantity_change": 10, # Just adding 10 to whatever it is, or we can use specific update logic if changed
                "price": 150.0 # Dummy price
            })
            # Wait, the models.py PositionUpdate is quantity_change, not absolute quantity?
            # Let's check models.py first.
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
                print(f"WebSocket received update for {ticker}. New Quantity: {updated_pos['quantity']}")
                print("SUCCESS: Push event received!")
            else:
                print("FAILURE: Ticker not found in update message")
                
        except asyncio.TimeoutError:
            print("FAILURE: Timed out waiting for WebSocket message")

if __name__ == "__main__":
    asyncio.run(test_push_update())
