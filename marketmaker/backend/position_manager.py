import redis
import json
from typing import List, Dict
from models import Position, PositionUpdate
from market_data_service import MarketDataService

import os

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_KEY_TICKERS = 'marketmaker:tickers'

class PositionManager:
    def __init__(self):
        self.redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        self.market_service = MarketDataService()

    def initialize_positions(self):
        """
        Initializes default positions for all active tickers if not already present.
        """
        # Check if we have the index set
        if self.redis.exists(REDIS_KEY_TICKERS):
            print("Positions already initialized in Redis.")
            return

        tickers_info = self.market_service.get_active_tickers()
        ticker_names = [t['ticker'] for t in tickers_info]
        
        print("Fetching initial prices...")
        prices = self.market_service.get_current_prices(ticker_names)
        
        pipeline = self.redis.pipeline()
        
        # Add all tickers to the set
        pipeline.sadd(REDIS_KEY_TICKERS, *ticker_names)
        
        for info in tickers_info:
            ticker = info['ticker']
            market = info['market']
            price = float(prices.get(ticker, 100.0))
            if str(price) == 'nan': 
                price = 100.0

            # Use Redis Hash for the position
            key = f"marketmaker:position:{ticker}"
            mapping = {
                "ticker": ticker,
                "quantity": 100000,
                "market": market,
                "avg_price": price,
                "current_price": price,
                "pnl": 0.0
            }
            pipeline.hset(key, mapping=mapping)
        
        pipeline.execute()
        print(f"Initialized {len(tickers_info)} positions in Redis.")

    def get_position(self, ticker: str) -> Position:
        key = f"marketmaker:position:{ticker}"
        data = self.redis.hgetall(key)
        if not data:
            return None
            
        try:
            return Position(
                ticker=data['ticker'],
                quantity=int(data['quantity']),
                market=data['market'],
                avg_price=float(data['avg_price']),
                current_price=float(data.get('current_price', 0.0)),
                pnl=float(data.get('pnl', 0.0))
            )
        except:
             return None

    def get_all_positions(self) -> List[Position]:
        # 1. Get all tickers from the set
        tickers = self.redis.smembers(REDIS_KEY_TICKERS)
        if not tickers:
            return []
            
        # 2. Construct namespaced keys
        keys = [f"marketmaker:position:{t}" for t in tickers]
        
        # 3. Pipeline HGETALL for all keys
        if not keys:
            return []

        pipeline = self.redis.pipeline()
        for key in keys:
            pipeline.hgetall(key)
        
        results = pipeline.execute()
        
        positions = []
        for data in results:
            if data:
                # Redis returns strings, convert types ensuring robustness
                try:
                    positions.append(Position(
                        ticker=data['ticker'],
                        quantity=int(data['quantity']),
                        market=data['market'],
                        avg_price=float(data['avg_price']),
                        current_price=float(data.get('current_price', 0.0)),
                        pnl=float(data.get('pnl', 0.0))
                    ))
                except Exception as e:
                    # Handle potentially corrupt or partial data gracefully
                    continue
                    
        return positions

    def update_position(self, update: PositionUpdate) -> Position:
        key = f"marketmaker:position:{update.ticker}"
        
        # Watch the key to ensure atomic read-modify-write for Quantity/AvgPrice logic
        # Although we are moving to Hashes, cost-basis calculation still needs the current state.
        # But crucially, we won't overwrite 'current_price' if the worker updates it in the background
        # because we will only HSET the fields we change.
        
        # However, to calculate new avg_price correctly, we need the CURRENT quantity and avg_price.
        # Only strict way is WATCH.
        
        with self.redis.pipeline() as pipe:
            while True:
                try:
                    pipe.watch(key)
                    data = pipe.hgetall(key)
                    if not data:
                        raise ValueError(f"Ticker {update.ticker} not found")
                    
                    current_qty = int(data['quantity'])
                    current_avg = float(data['avg_price'])
                    
                    new_quantity = current_qty + update.quantity_change
                    new_avg = current_avg
                    
                    if new_quantity > 0:
                        total_cost = (current_qty * current_avg) + (update.quantity_change * update.price)
                        new_avg = total_cost / new_quantity
                    else:
                        new_avg = 0.0
                    
                    # We also update 'current_price' and 'pnl' based on the trade price?
                    # Usually trade price doesn't dictate market price, but for PnL recalc it helps.
                    # Let's say we do update them.
                    current_price = update.price
                    pnl = (current_price - new_avg) * new_quantity

                    pipe.multi()
                    mapping = {
                        "quantity": new_quantity,
                        "avg_price": new_avg,
                        "current_price": current_price,
                        "pnl": pnl
                    }
                    pipe.hset(key, mapping=mapping)
                    pipe.execute()
                    
                    # 4. PUBLISH Update (Decoupled UI)
                    # Frontend expects an Array of positions
                    self.redis.publish("updates:positions", json.dumps([mapping]))
                    
                    # Return full object
                    return Position(
                        ticker=data['ticker'],
                        market=data['market'],
                        quantity=new_quantity,
                        avg_price=new_avg,
                        current_price=current_price,
                        pnl=pnl
                    )
                except redis.WatchError:
                    continue # Retry

    async def add_position(self, ticker: str) -> Position:
        # Check namespaced key
        info = await self.market_service.get_ticker_info(ticker)
        normalized_ticker = info['ticker']
        key = f"marketmaker:position:{normalized_ticker}"
        
        if self.redis.exists(key):
             data = self.redis.hgetall(key)
             return Position(
                ticker=data['ticker'],
                quantity=int(data['quantity']),
                market=data['market'],
                avg_price=float(data['avg_price']),
                current_price=float(data.get('current_price', 0.0)),
                pnl=float(data.get('pnl', 0.0))
            )

        position = Position(
            ticker=normalized_ticker,
            quantity=100000,
            market=info['market'],
            avg_price=info['price'],
            current_price=info['price'],
            pnl=0.0
        )
        
        mapping = {
            "ticker": position.ticker,
            "quantity": position.quantity,
            "market": position.market,
            "avg_price": position.avg_price,
            "current_price": position.current_price,
            "pnl": position.pnl
        }

        # Transaction: Add to Set + HSet
        pipeline = self.redis.pipeline()
        pipeline.sadd(REDIS_KEY_TICKERS, normalized_ticker)
        pipeline.hset(key, mapping=mapping)
        pipeline.execute()
        
        return position

    # update_market_prices moved to MarketDataWorker
    
    def update_position_from_execution(self, ticker: str, qty_delta: int, price: float):
        """
        Updates position based on a trade execution.
        """
        key = f"marketmaker:position:{ticker}"
        
        with self.redis.pipeline() as pipe:
            while True:
                try:
                    pipe.watch(key)
                    data = pipe.hgetall(key)
                    
                    if not data:
                        # Should we create if not exists? Yes, if MM trades it, it should exist.
                        # But typically initialized.
                        current_qty = 0
                        current_avg = 0.0
                        market = "Unknown"
                        pnl = 0.0
                    else:
                        current_qty = int(data.get('quantity', 0))
                        current_avg = float(data.get('avg_price', 0.0))
                        market = data.get('market', 'NASDAQ')
                        pnl = float(data.get('pnl', 0.0))
                    
                    new_quantity = current_qty + qty_delta
                    
                    # Avg Price Calculation (Weighted Average)
                    if new_quantity == 0:
                        new_avg = 0.0
                    elif new_quantity > 0:
                         # Adding to long or reducing short (if flips, this simple formula breaks cost basis logic actually)
                         # Simple Weighted Average valid for accumulation
                         total_cost = (current_qty * current_avg) + (qty_delta * price)
                         new_avg = total_cost / new_quantity
                    else: 
                         # Short position logic can be complex.
                         # For this lab: Simple Weighted Average of "exposure"
                         # Logic: If I have -100 @ 100, and Sell -100 @ 110. Total -200.
                         # Cost basis increases? 
                         # Let's keep it simple: Absolute value weighted average if same sign?
                         # Or just standard formula works if we treat cost as signed?
                         # ( -100 * 100 ) + ( -100 * 110 ) = -10000 - 11000 = -21000. 
                         # -21000 / -200 = 105. Correct.
                         # What if flip? 100 @ 100. Sell 200 @ 110. Result -100.
                         # (100*100) + (-200*110) = 10000 - 22000 = -12000.
                         # -12000 / -100 = 120. 
                         # Cost basis for remaining short is 110? No, this formula creates PnL realized.
                         # Realized PnL logic is handled separately in real systems.
                         # For this prototype: Standard Weighted Avg is acceptable approx.
                         total_cost = (current_qty * current_avg) + (qty_delta * price)
                         new_avg = total_cost / new_quantity

                    # Update PnL (Open PnL approx)
                    # We'll use the trade price as "Mark to Market" for this snapshot
                    updated_pnl = (price - new_avg) * new_quantity
                    
                    pipe.multi()
                    if not data:
                        # If creating new
                        pipe.sadd(REDIS_KEY_TICKERS, ticker)
                        
                    mapping = {
                        "ticker": ticker,
                        "market": market,
                        "quantity": new_quantity,
                        "avg_price": new_avg,
                        "current_price": price,
                        "pnl": updated_pnl
                    }
                    pipe.hset(key, mapping=mapping)
                    pipe.execute()
                    
                    # PUBLISH Update
                    self.redis.publish("updates:positions", json.dumps([mapping]))
                    
                    print(f"Inventory Updated for {ticker}: {current_qty} -> {new_quantity}")
                    return
                except redis.WatchError:
                    continue
