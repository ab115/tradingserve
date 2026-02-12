import asyncio
import json
import logging
import signal
import sys
import os
from datetime import datetime
import redis.asyncio as redis
from contextlib import asynccontextmanager

import config
from position_manager import PositionManager
from market_data_worker import MarketDataWorker
from fix_client import FIXClient
from strategies.avellaneda_stoikov import AvellanedaStoikovStrategy
from strategies.constant_spread import ConstantSpreadStrategy
from tradingserver_core.service_host import ServiceHost 
from tradingserver_core.stream_log import setup_logging

# Setup Logging
logger = setup_logging("market_maker_worker")

# Globals
manager = PositionManager()
md_worker = MarketDataWorker()
active_tickers = set()
strategies = {}
quoting_enabled = True

# Strategy Config
GLOBAL_GAMMA = 0.1
GLOBAL_SIGMA = 0.5
ACTIVE_STRATEGY_TYPE = "AvellanedaStoikov"

# Components
fix_client = None

def get_or_create_strategy(ticker: str):
    global strategies
    if ticker not in strategies:
        if ACTIVE_STRATEGY_TYPE == "AvellanedaStoikov":
             strategies[ticker] = AvellanedaStoikovStrategy(ticker, gamma=GLOBAL_GAMMA, sigma=GLOBAL_SIGMA)
        else:
             strategies[ticker] = ConstantSpreadStrategy(ticker, spread=0.05, skew=0.0)
    return strategies[ticker]

def on_fill(ticker: str, side: str, qty: int, price: float):
    logger.info(f"TRADE CONFIRMED: {side} {qty} {ticker} @ {price}")
    signed_qty = qty if side == "Buy" else -qty
    try:
        manager.update_position_from_execution(ticker, signed_qty, price)
        # Broadcast via Redis is handled by PositionManager internal logic or we need to ensure it publishes?
        # PositionManager writes to Redis. API picks it up.
    except Exception as e:
        logger.error(f"Failed to update inventory: {e}")

# Sync Redis Client for FIX Thread
sync_redis_client = None

def get_sync_redis():
    global sync_redis_client
    if not sync_redis_client:
        import redis as sync_redis
        # Use a single connection pool
        pool = sync_redis.ConnectionPool(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=False)
        sync_redis_client = sync_redis.Redis(connection_pool=pool)
    return sync_redis_client

def on_fix_event(event_type: str, data: dict):
    # Publish to Redis 'updates:events'
    # Use global sync client to avoid connection leak
    try:
        r = get_sync_redis()
        # Data often contains timestamps or other non-serializable objects?
        # Check data serialization safety
        payload = json.dumps({"type": "EVENT", "subtype": event_type, "data": data}, default=str)
        r.publish("updates:events", payload)
    except Exception as e:
        logger.error(f"Failed to publish event: {e}")

async def on_market_data(data: str):
    global quoting_enabled
    try:
        positions_list = []
        try:
             parsed = json.loads(data)
             if isinstance(parsed, list): positions_list = parsed
             elif isinstance(parsed, dict): positions_list = [parsed]
        except: return

        for pos in positions_list:
            ticker = pos.get('ticker')
            price = pos.get('current_price')
            
            if not ticker or not price: continue
            if not quoting_enabled: continue
            if ticker not in active_tickers: continue

            strategy = get_or_create_strategy(ticker)
            strategy.on_market_data_update(ticker, price)
            qty = pos.get('quantity', 0)
            strategy.on_inventory_update(ticker, qty)
            
            bid, ask = strategy.calculate_quotes()
            # Execute via FIX
            if bid and ask and fix_client:
                fix_client.place_or_replace_order(ticker, "Buy", bid, 100)
                fix_client.place_or_replace_order(ticker, "Sell", ask, 100)

        pass

    except Exception as e:
        logger.error(f"Error in strategy loop: {e}")

async def control_listener():
    """Listen for commands from API"""
    global quoting_enabled, GLOBAL_GAMMA, GLOBAL_SIGMA, ACTIVE_STRATEGY_TYPE, strategies, active_tickers
    r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe("control:marketmaker")
    
    logger.info("Listening for control commands...")
    async for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                data = json.loads(message['data'])
                cmd = data.get('cmd')
                
                if cmd == 'toggle_quoting':
                    quoting_enabled = data.get('enable')
                    logger.info(f"Quoting Enabled: {quoting_enabled}")
                    # Acknowledge? API might assume success.
                    
                elif cmd == 'update_params':
                    GLOBAL_GAMMA = data.get('gamma', GLOBAL_GAMMA)
                    GLOBAL_SIGMA = data.get('sigma', GLOBAL_SIGMA)
                    logger.info(f"Params Updated: Gamma={GLOBAL_GAMMA}, Sigma={GLOBAL_SIGMA}")
                    # Update active strategies
                    for s in strategies.values():
                        if hasattr(s, 'set_parameters'): s.set_parameters({'gamma': GLOBAL_GAMMA, 'sigma': GLOBAL_SIGMA})
                        
                elif cmd == 'switch_strategy':
                    new_type = data.get('strategy')
                    if new_type != ACTIVE_STRATEGY_TYPE:
                        ACTIVE_STRATEGY_TYPE = new_type
                        strategies.clear() # Reset
                        logger.info(f"Switched Strategy to {ACTIVE_STRATEGY_TYPE}")
                        
                elif cmd == 'add_ticker':
                    ticker = data.get('ticker')
                    if ticker:
                        active_tickers.add(ticker)
                        logger.info(f"Ticker Added: {ticker}")
                        await md_worker.subscribe_ticker(ticker)

                elif cmd == 'sweep':
                    await sweep_open_orders()

            except Exception as e:
                logger.error(f"Control Error: {e}")

async def sweep_open_orders():
    logger.info("Triggering Aggressive Liquidity Sweep (Filling Open Orders)...")
    if not fix_client or not fix_client.is_connected:
        logger.error("Sweep Aborted: FIX Client Not Connected.")
        return

    r_sweep = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    try:
        # NEW LOGIC: Iterate Exchange Snapshots
        # keys = exchange:snapshot:{symbol}
        keys = await r_sweep.keys("exchange:snapshot:*")
        count = 0
        
        for key in keys:
            data_json = await r_sweep.get(key)
            if not data_json: continue
            
            try:
                book_state = json.loads(data_json)
                orders = book_state.get("orders", [])
                
                for order in orders:
                    # Filter: We want to FILL orders from OTHERS (Clients)
                    if order.get("sender_comp_id") == config.SENDER_COMP_ID:
                        continue

                    # Target Open Orders (Exchange state usually only has Open orders)
                    # Use 'id' as ClOrdID
                    oid = order.get("id")
                    symbol = order.get("symbol")
                    side = order.get("side")
                    price = float(order.get("price", 0))
                    qty = int(order.get("qty", 0)) # Remaining Qty in book
                    
                    if qty > 0:
                        is_buy = side in ["1", "Buy"]
                        # We want to TAKE liquidity, so we place OPPOSITE order
                        action_side = "Sell" if is_buy else "Buy"
                        
                        logger.info(f"Sweeping Against {oid}: {action_side} {qty} {symbol} @ {price}")
                        
                        # Place Aggressive Order (Market Order to guarantee fill)
                        try:
                            # Pass price=0 to force Tag 40=1 (Market)
                            fix_client.send_aggressive_order(symbol, action_side, 0, qty, ref_id=oid)
                            count += 1
                            await asyncio.sleep(0.01)
                        except Exception as e:
                            logger.error(f"Failed to sweep {oid}: {e}")
                            
            except Exception as e:
                logger.error(f"Error parsing snapshot {key}: {e}")
        
        logger.info(f"Sweep Triggered: {count} aggressive orders sent.")
                    
    except Exception as e:
        logger.error(f"Sweep Error: {e}")
    finally:
        await r_sweep.aclose()

async def discover_active_tickers():
    logger.info("Scanning Exchange Logic: Discovering Tickers with ANY active orders...")
    
    r_scan = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    try:
        # NEW LOGIC: Scan Exchange Snapshots
        keys = await r_scan.keys("exchange:snapshot:*")
        count = 0
        new_tickers = set()
        
        for key in keys:
             # key format: exchange:snapshot:{symbol}
             # Just extract symbol from key is enough, but check if book has orders?
             # If book is empty, maybe don't quote?
             # Current logic: "tickers with ANY active orders".
             
             data_json = await r_scan.get(key)
             if data_json:
                 try:
                     book = json.loads(data_json)
                     orders = book.get("orders", [])
                     if len(orders) > 0:
                         symbol = book.get("symbol")
                         if symbol:
                             new_tickers.add(symbol)
                 except: pass
        
        for t in new_tickers:
            active_tickers.add(t)
            key = f"marketmaker:position:{t}"
            if await r_scan.exists(key):
                    await r_scan.hset(key, "algo_active", "true")
            
            logger.info(f"Discovered Active Ticker: {t}")
            # Subscribe to Market Data for this ticker
            await md_worker.subscribe_ticker(t)
            count += 1
        
        if count == 0 and len(new_tickers) == 0:
             logger.info("No active tickers found on Exchange. Adding Defaults...")
             for t in ["AAPL", "MSFT"]:
                 active_tickers.add(t)
                 await md_worker.subscribe_ticker(t)
                 logger.info(f"Broadcasting Default Ticker: {t}")
        else:
             logger.info(f"Discovery Complete. Active Tickers: {active_tickers}")
             # Ensure defaults are there too?
             for t in ["AAPL", "MSFT"]:
                 if t not in active_tickers:
                     active_tickers.add(t)
                     await md_worker.subscribe_ticker(t)
                     logger.info(f"Broadcasting Default Ticker: {t}")

    except Exception as e:
        logger.error(f"Discovery Error: {e}")
    finally:
        await r_scan.aclose()

async def main():
    global fix_client
    logger.info("Starting Market Maker Worker...")
    
    # Initialize FIX
    fix_client = FIXClient(
        host=config.ECN_HOST,
        port=config.ECN_PORT,
        sender_comp_id=config.SENDER_COMP_ID,
        target_comp_id=config.TARGET_COMP_ID,
        on_fill_callback=on_fill,
        on_activity_callback=on_fix_event
    )
    fix_client.connect()
    
    # Discover Active Tickers (Quote on any symbol with active orders)
    await discover_active_tickers()
    
    # Initialize Positions (Updates Redis with default positions for NEW tickers if needed)
    manager.initialize_positions()
    
    # Removed: Explicit loading of "all inactive tickers" from PositionManager. 
    # Only active tickers discovered above are quoted.
    
    # Start Control Listener
    asyncio.create_task(control_listener())
    
    # Start Market Data Loop
    await md_worker.run_subscription_loop(on_market_data)

if __name__ == "__main__":
    host = ServiceHost(service_name="market_maker")
    asyncio.run(host.run(main))
