import sys
import os
import unittest
import logging
import redis
import time

# Add backend to path
base_dir = os.path.dirname(__file__)
root_dir = os.path.abspath(os.path.join(base_dir, '..'))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, 'backend')) # CRITICAL: Allows 'from models import' to work

from backend.fix_client import FIXClient
from backend.position_manager import PositionManager
import backend.config as config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestIntegration")

class TestPositionIntegration(unittest.TestCase):
    def setUp(self):
        # 1. Connect to Redis (Real container connection)
        self.redis = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
        self.manager = PositionManager()
        
        # 2. Reset State for GOOG
        self.ticker = "GOOG"
        self.initial_qty = 100000
        self.initial_price = 150.0
        
        key = f"marketmaker:position:{self.ticker}"
        self.redis.delete(key)
        
        # Seed Initial Position
        mapping = {
            "ticker": self.ticker,
            "quantity": self.initial_qty,
            "market": "NASDAQ",
            "avg_price": self.initial_price,
            "current_price": self.initial_price,
            "pnl": 0.0
        }
        self.redis.hset(key, mapping=mapping)
        self.redis.sadd('marketmaker:tickers', self.ticker)
        
        logger.info(f"Seeded Redis: {self.ticker} Qty={self.initial_qty}")

    def test_fix_fill_updates_redis(self):
        # 1. Define Real Callback
        def on_fill_callback(ticker, side, qty, price):
            logger.info(f"Callback Triggered: {side} {qty} {ticker} @ {price}")
            # Calculate Signed Qty
            signed_qty = qty if side == "Buy" else -qty
            # Update Manager (Real Logic)
            self.manager.update_position_from_execution(ticker, signed_qty, price)

        # 2. Init Client
        client = FIXClient("localhost", 9898, "MKR", "ECN", on_fill_callback=on_fill_callback)
        
        # 3. Simulate Message (Buy 100 @ 155.0)
        # Raw string simulation (Parsing Logic Verified previously)
        # 39=2 (Filled), 32=100 (LastShares), 55=GOOG
        fill_qty = 100
        fill_price = 155.0
        
        # Construct raw string manually to ensure 100% control
        msg = f"8=FIX.4.2\x019=100\x0135=8\x0134=2\x0149=ECN\x0156=MKR\x0132={fill_qty}\x0131={fill_price}\x0139=2\x0154=1\x0155={self.ticker}\x0111=ID\x0110=000\x01"
        
        # 4. Inject into Client
        logger.info("Injecting FIX Message...")
        client._process_fix_message(msg)
        
        # 5. Verify Redis
        # Expected: 100,000 + 100 = 100,100
        key = f"marketmaker:position:{self.ticker}"
        data = self.redis.hgetall(key)
        
        final_qty = int(data.get('quantity', 0))
        logger.info(f"Final Redis Qty: {final_qty}")
        
        self.assertEqual(final_qty, self.initial_qty + fill_qty)
        self.assertAlmostEqual(float(data['current_price']), fill_price)

if __name__ == "__main__":
    unittest.main()
