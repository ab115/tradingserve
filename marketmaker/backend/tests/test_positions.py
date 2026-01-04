from fastapi.testclient import TestClient
from main import app
import pytest

client = TestClient(app)

def test_update_position():
    # 1. Get initial state for a known ticker
    # We assume 'AAPL' was initialized by default
    response = client.get("/positions")
    assert response.status_code == 200
    positions = response.json()
    
    aapl_position = next((p for p in positions if p['ticker'] == 'AAPL'), None)
    assert aapl_position is not None, "AAPL position not found/initialized"
    
    initial_quantity = aapl_position['quantity']
    
    # 2. Update position
    update_payload = {
        "ticker": "AAPL",
        "quantity_change": 10,
        "price": aapl_position['current_price']
    }
    
    response = client.post("/positions/update", json=update_payload)
    assert response.status_code == 200
    updated_position = response.json()
    
    # 3. Verify update
    assert updated_position['quantity'] == initial_quantity + 10
    assert updated_position['ticker'] == "AAPL"
    
    # 4. Verify persistence
    response = client.get("/positions")
    positions = response.json()
    entries = [p for p in positions if p['ticker'] == 'AAPL']
    assert len(entries) == 1
    assert entries[0]['quantity'] == initial_quantity + 10
