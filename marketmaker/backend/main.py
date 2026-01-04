from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import asyncio
import uvicorn
import json
from contextlib import asynccontextmanager

import config
import logging

# Configure Logging to ensure INFO messages (EXEC REPORT) are seen
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

import time
from datetime import datetime
import redis

from position_manager import PositionManager
from models import Position, PositionUpdate, PositionCreate
# Strategy & Connectivity
from fix_client import FIXClient
from strategies.avellaneda_stoikov import AvellanedaStoikovStrategy
from strategies.constant_spread import ConstantSpreadStrategy
from market_data_worker import MarketDataWorker

# --- Global Components ---
manager = PositionManager()
worker = MarketDataWorker()

# --- Global Components ---
manager = PositionManager()
worker = MarketDataWorker()

# Dictionary to hold strategy instances for each ticker
# Key: Ticker Symbol, Value: Strategy Instance
strategies = {}

# Set of tickers that have active/open orders on the exchange
# The Market Maker will ONLY quote these tickers.
# Set of tickers that have active/open orders on the exchange
# The Market Maker will ONLY quote these tickers.
# Set of tickers that have active/open orders on the exchange
# The Market Maker will ONLY quote these tickers.
active_tickers = set()

# --- Global Strategy Configuration ---
GLOBAL_GAMMA = 0.1
GLOBAL_SIGMA = 0.5
ACTIVE_STRATEGY_TYPE = "AvellanedaStoikov" # or "ConstantSpread"

def get_or_create_strategy(ticker: str):
    global strategies
    if ticker not in strategies:
        # Create using Global Config
        if ACTIVE_STRATEGY_TYPE == "AvellanedaStoikov":
             strategies[ticker] = AvellanedaStoikovStrategy(ticker, gamma=GLOBAL_GAMMA, sigma=GLOBAL_SIGMA)
        else:
             strategies[ticker] = ConstantSpreadStrategy(ticker, spread=0.05, skew=0.0) # Default for now
    return strategies[ticker]

# --- REDIS PUB/SUB ---
async def redis_subscriber_loop():
    """
    Listens for updates from PositionManager (updates:positions) and broadcasts to UI.
    This decouples the FIX thread from the Async Web Server.
    """
    try:
        r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
        pubsub = r.pubsub()
        pubsub.subscribe("updates:positions")
        pubsub.subscribe("updates:events")
        print("Redis Subscriber listening on updates:positions and updates:events...")
        
        while True:
            # Check for message non-blocking with loop sleep to yield
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                if message['type'] == 'message':
                    channel = message['channel']
                    raw_data = message['data']
                    
                    if channel == "updates:positions":
                        # Inject algo_active flag into Position List
                        try:
                            data = json.loads(raw_data)
                            if isinstance(data, list):
                                for p in data:
                                    p['algo_active'] = p.get('ticker') in active_tickers
                                await ws_manager.broadcast(json.dumps(data))
                        except Exception as e:
                            print(f"Error processing position update: {e}")
                            
                    elif channel == "updates:events":
                        # Pass events through directly
                        await ws_manager.broadcast(raw_data)
            
            await asyncio.sleep(0.01) # Yield control
            
    except Exception as e:
        print(f"Redis Subscriber Error: {e}")

async def broadcast_positions():
    """Helper to fetch and broadcast all positions to WS clients."""
    try:
        positions = manager.get_all_positions()
        await ws_manager.broadcast(json.dumps([p.model_dump() for p in positions]))
    except Exception as e:
        print(f"Broadcast Error: {e}")

# Removed duplicate get_or_create_strategy definition

# --- Callback for Fills ---
def on_fill(ticker: str, side: str, qty: int, price: float):
    """
    Called by FIXClient when a trade occurs.
    Updates the inventory.
    """
    print(f"TRADE CONFIRMED: {side} {qty} {ticker} @ {price}")
    
    # Debug: Pre-Update
    try:
        pre_pos = manager.get_position(ticker)
        print(f"DEBUG: Pre-Update Position for {ticker}: {pre_pos.quantity if pre_pos else 'None'}")
    except:
        print(f"DEBUG: Pre-Update Position for {ticker}: Error fetching")

    # Calculate signed quantity (Buy = +qty, Sell = -qty)
    signed_qty = qty if side == "Buy" else -qty
    
    try:
        manager.update_position_from_execution(ticker, signed_qty, price)
        
        # Debug: Post-Update
        post_pos = manager.get_position(ticker)
        print(f"DEBUG: Post-Update Position for {ticker}: {post_pos.quantity if post_pos else 'None'}")
        
    except Exception as e:
        print(f"Failed to update inventory: {e}")
        
    except Exception as e:
        print(f"Failed to update inventory: {e}")
        
    # No longer need manual broadcast injection.
    # redis_subscriber_loop() picks it up and broadcasts to UI.

def on_fix_event(event_type: str, data: dict):
    """
    Called by FIXClient for significant events (Order Sent, Exec Report).
    Publishes to Redis 'updates:events' channel.
    """
    try:
        r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=False) # Keep binary for json
        payload = json.dumps({"type": "EVENT", "subtype": event_type, "data": data})
        r.publish("updates:events", payload)
    except Exception as e:
        print(f"Failed to publish event: {e}")

# Initialize FIX Client
fix_client = FIXClient(
    host=config.ECN_HOST,
    port=config.ECN_PORT,
    sender_comp_id=config.SENDER_COMP_ID,
    target_comp_id=config.TARGET_COMP_ID,
    on_fill_callback=on_fill,
    on_activity_callback=on_fix_event
)

# --- Order Watcher (Lite Mode) ---
import redis
import threading

class OrderWatcher:
    """
    Listens to 'updates:orders' to detect which tickers are active on the Exchange.
    Only tickers seen here will be quoted by the Market Maker.
    """
    def __init__(self):
        self.r = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            decode_responses=True
        )
        self.running = False

    def start(self):
        self.running = True
        # 1. Seed from existing orders (optional, but good for restart)
        try:
            order_ids = self.r.smembers("orders:all")
            for oid in order_ids:
                sym = self.r.hget(f"order:{oid}", "Symbol")
                if sym:
                    active_tickers.add(sym)
            print(f"Active Tickers seeded from History: {active_tickers}")
        except Exception as e:
            print(f"Failed to seed active tickers: {e}")

        # 2. Start Listener Thread
        threading.Thread(target=self._listen_loop, daemon=True).start()

    def _listen_loop(self):
        pubsub = self.r.pubsub()
        pubsub.subscribe("updates:orders")
        print("OrderWatcher listening on updates:orders...")
        
        while self.running:
            try:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message['type'] == 'message':
                    data = json.loads(message['data'])
                    sym = data.get('Symbol')
                    if sym:
                        if sym not in active_tickers:
                            print(f"New Active Ticker Detected: {sym}")
                            active_tickers.add(sym)
            except Exception as e:
                print(f"OrderWatcher Error: {e}")
                time.sleep(1)

order_watcher = OrderWatcher()

# --- Global QUOTING CONTROL ---
quoting_enabled = True

# --- Event Callback for Market Data ---
async def on_market_data(data: str):
    """
    Called by MarketDataWorker whenever a price update arrives.
    """
    global quoting_enabled
    try:
        # 1. Parse Data
        positions_list = []
        try:
            parsed = json.loads(data)
            if isinstance(parsed, list):
                positions_list = parsed
            elif isinstance(parsed, dict):
                 positions_list = [parsed]
        except:
             return

        for pos in positions_list:
            ticker = pos.get('ticker')
            price = pos.get('current_price')
            
            if not ticker or not price:
                continue

            # Check Global Toggle
            if not quoting_enabled:
                 continue

            # LITE MODE CHECK: Only proceed if ticker is ACTIVE
            if ticker not in active_tickers:
                # print(f"DEBUG: Skipping {ticker} (No active orders)")
                continue

            # 2. Get/Create Strategy for this Ticker
            strategy = get_or_create_strategy(ticker)
            
            # 3. Update Strategy State
            strategy.on_market_data_update(ticker, price)
            
            # Sync Inventory from Redis (via PositionManager ideally, but here using data feed snapshot)
            qty = pos.get('quantity', 0)
            strategy.on_inventory_update(ticker, qty)
            
            # 4. Calculate New Quotes
            bid, ask = strategy.calculate_quotes()
            print(f"DEBUG: Strategy {ticker} Mid={price} -> Quote Bid={bid}, Ask={ask}")
            
            # 5. Execute via FIX
            if bid and ask:
                    # Place/Update BID
                    fix_client.place_or_replace_order(ticker, "Buy", bid, 100)
                    # Place/Update ASK
                    fix_client.place_or_replace_order(ticker, "Sell", ask, 100)
                     
        # Forward to UI with algo_active injection
        parsed_data = json.loads(data)
        if isinstance(parsed_data, list):
             for p in parsed_data:
                 p['algo_active'] = p.get('ticker') in active_tickers
        elif isinstance(parsed_data, dict):
             parsed_data['algo_active'] = parsed_data.get('ticker') in active_tickers
             parsed_data = [parsed_data]
             
        await ws_manager.broadcast(json.dumps(parsed_data))
        
    except Exception as e:
        print(f"Error in strategy loop: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        print(f"Starting Multi-Ticker Market Maker ({config.STRATEGY_TYPE})...")
        manager.initialize_positions()
        
        # Start Order Watcher
        order_watcher.start()

        # Connect to FIX
        fix_client.connect()
        
        # Start background task for price updates
        asyncio.create_task(worker.run_subscription_loop(on_market_data))
        
        # Start Redis Subscriber for Position Updates
        asyncio.create_task(redis_subscriber_loop())
        
    except Exception as e:
        print(f"Startup error: {e}")
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

ws_manager = ConnectionManager() # Ensure this is instantiated

# --- NEW ENDPOINTS ---

@app.post("/strategy/params")
async def update_strategy_params(params: dict):
    global GLOBAL_GAMMA, GLOBAL_SIGMA
    
    # Update Globals
    if 'gamma' in params: GLOBAL_GAMMA = float(params['gamma'])
    if 'sigma' in params: GLOBAL_SIGMA = float(params['sigma'])
    
    print(f"Global Params Updated: Gamma={GLOBAL_GAMMA}, Sigma={GLOBAL_SIGMA}")
    
    # Update Active Strategies
    for ticker, strat in strategies.items():
        if hasattr(strat, 'set_parameters'):
            strat.set_parameters(params)
            
    return {"status": "ok", "gamma": GLOBAL_GAMMA, "sigma": GLOBAL_SIGMA}

@app.post("/strategy/switch")
async def switch_strategy_type(payload: dict):
    global ACTIVE_STRATEGY_TYPE, strategies
    new_type = payload.get("strategy")
    
    if new_type not in ["AvellanedaStoikov", "ConstantSpread"]:
        raise HTTPException(status_code=400, detail="Invalid Strategy Type")
        
    if new_type == ACTIVE_STRATEGY_TYPE:
        return {"status": "no_change"}
        
    print(f"Switching Strategy to {new_type}...")
    ACTIVE_STRATEGY_TYPE = new_type
    
    # Clear current instances so they are recreated lazily
    # OR recreate immediately
    strategies.clear()
    
    return {"status": "switched", "strategy": ACTIVE_STRATEGY_TYPE}
    
@app.post("/tools/sweep")
async def trigger_sweep_tool():
    """
    Triggers the Sweep & Fill logic using the EXISTING FIX Connection!
    No need for external script.
    """
    print("Triggering Sweep & Fill Tool...")
    
    # 1. Scan Redis for Open Orders
    r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    order_ids = r.smembers("orders:all")
    
    count = 0
    for oid in order_ids:
        data = r.hgetall(f"order:{oid}")
        if not data: continue
        
        status = data.get("OrdStatus")
        # Check string or code status
        if status in ["0", "1", "New", "PartiallyFilled"]:
            symbol = data.get("Symbol")
            side = data.get("Side") # 1/Buy or 2/Sell
            try:
                 leaves = int(float(data.get("LeavesQty", 0)))
            except:
                 leaves = 0
                 
            if leaves > 0:
                # Oppose Side
                # If Side is 1/Buy -> Sell (2). If 2/Sell -> Buy (1)
                is_buy = side in ["1", "Buy"]
                opp_side = "2" if is_buy else "1"
                
                # Send Market Order via our EXISTING Client
                # NOTE: This uses MARKETMAKER session, which is fine since we are the MM cleaning up.
                # Just need to ensure we don't 'fight' ourselves if we have open orders.
                # Actually, if we sweep our own orders, we might just cancel? 
                # But let's assume we are sweeping 'active' orders on the exchange.
                
                print(f"Sweeping {symbol}: Sending Market {'Sell' if is_buy else 'Buy'} for {leaves}")
                
                # We use the internal 'place_or_replace' but force it to be a MARKET sweep?
                # No, place_or_replace is LIMIT. 
                # Use raw send.
                
                fix_client._send_fix_msg_unsafe("D", {
                    "11": f"SWEEP-{int(time.time()*1000)}",
                    "21": "1",
                    "55": symbol,
                    "54": opp_side,
                    "38": leaves,
                    "40": "1", # Market
                    "60": datetime.utcnow().strftime('%Y%m%d-%H:%M:%S')
                })
                count += 1
                
    return {"status": "complete", "orders_swept": count}

ws_manager = ConnectionManager()

@app.get("/positions", response_model=List[Position])
async def get_positions():
    return manager.get_all_positions()

@app.post("/positions/update", response_model=Position)
async def update_position(update: PositionUpdate):
    try:
        new_pos = manager.update_position(update)
        # Broadcast update immediately
        positions = manager.get_all_positions()
        await ws_manager.broadcast(json.dumps([p.model_dump() for p in positions]))
        return new_pos
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/control/status")
async def get_control_status():
    global quoting_enabled
    return {"quoting_enabled": quoting_enabled}

@app.post("/control/toggle")
async def toggle_quoting(enable: bool):
    global quoting_enabled
    quoting_enabled = enable
    print(f"Quoting Enabled: {quoting_enabled}")
    
    # Broadcast status change to UI via WS special message?
    # Or UI requests refresh. Simpler to just return it.
    await ws_manager.broadcast(json.dumps({"type": "STATUS_UPDATE", "quoting_enabled": quoting_enabled}))
    
    return {"quoting_enabled": quoting_enabled}

@app.post("/positions/add", response_model=Position)
async def add_position(create: PositionCreate):
    try:
        new_pos = await manager.add_position(create.ticker)
        
        # Explicitly Activate Quoting for this new ticker
        active_tickers.add(create.ticker)
        print(f"Added {create.ticker} to Active Tickers via API.")
        
        # Broadcast update
        positions = manager.get_all_positions()
        # Inject flag
        pos_list = [p.model_dump() for p in positions]
        for p in pos_list:
            p['algo_active'] = p['ticker'] in active_tickers
            
        await ws_manager.broadcast(json.dumps(pos_list))
        return new_pos
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial state
        # Send initial state
        positions = manager.get_all_positions()
        pos_list = [p.model_dump() for p in positions]
        for p in pos_list:
            p['algo_active'] = p['ticker'] in active_tickers
        await websocket.send_text(json.dumps(pos_list))
        
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
