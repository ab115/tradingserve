import sys
import time
import logging
import json
import redis
import os
from datetime import datetime

# Add paths for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fix_client import FIXClient
import config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SweepAndFill")

def sweep():
    r = redis.Redis(
        host=config.REDIS_HOST, 
        port=config.REDIS_PORT, 
        decode_responses=True
    )
    
    # 1. Identify Open Orders
    logger.info("Scanning Redis for open orders...")
    order_ids = r.smembers("orders:all")
    open_orders = []
    
    for oid in order_ids:
        data = r.hgetall(f"order:{oid}")
        if not data: continue
        
        # OrdStatus: 0=New, 1=Partially Filled (or string versions)
        status = data.get("OrdStatus")
        if status in ["0", "1", "New", "PartiallyFilled"]:
            # Check Side: 1=Buy, 2=Sell (or string versions)
            symbol = data.get("Symbol")
            side = data.get("Side")
            leaves = int(data.get("LeavesQty", data.get("OrderQty", 0)))
            
            if leaves > 0 and symbol and side:
                open_orders.append({
                    "Symbol": symbol,
                    "Side": side,
                    "LeavesQty": leaves,
                    "OrdID": oid
                })
    
    if not open_orders:
        logger.info("No open orders found to sweep.")
        return

    logger.info(f"Found {len(open_orders)} open orders. Preparing to sweep...")

    # 2. Setup Raw FIX Client (Use CLIENT5 to avoid fighting with MARKETMAKER session)
    client = FIXClient(
        host=config.ECN_HOST,
        port=config.ECN_PORT,
        sender_comp_id="CLIENT5",
        target_comp_id=config.TARGET_COMP_ID
    )
    
    try:
        client.connect()
        # Wait for logon (FIXClient sends A message on connect)
        time.sleep(2) 
        
        # 3. Send Opposing Market Orders
        for order in open_orders:
            symbol = order["Symbol"]
            orig_side = order["Side"]
            qty = order["LeavesQty"]
            
            # Oppose: 1(Buy) -> 2(Sell), 2(Sell) -> 1(Buy)
            # Handle both code strings "1"/"2" and label strings "Buy"/"Sell"
            opp_side = "2" if orig_side in ["1", "Buy"] else "1"
            side_label = "SELL" if opp_side == "2" else "BUY"
            
            logger.info(f"Sweeping {qty} {symbol} (Targeting Orig Side {orig_side}) by sending {side_label} Market Order...")
            
            # Use raw _send_fix_msg to send a MARKET order (Type 'D', OrdType '1')
            client._send_fix_msg("D", {
                "11": f"SWEEP-{int(time.time()*1000)}",
                "21": "1", # HandlInst
                "55": symbol,
                "54": opp_side,
                "38": qty,
                "40": "1", # Market
                "60": datetime.utcnow().strftime('%Y%m%d-%H:%M:%S')
            })
            time.sleep(0.2) # Throttling

        logger.info("Sweep complete. Waiting 5s for processing...")
        time.sleep(5)
        
    finally:
        client.running = False
        if client.sock:
            client.sock.close()

if __name__ == "__main__":
    sweep()
