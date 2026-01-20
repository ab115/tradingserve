import os
import redis
import pandas as pd
import asyncio
import json
from models import Position
from market_data_service import MarketDataService
import config

async def load_data():
    print("Initializing Data Loader...")
    
    # 1. Setup Redis and Service
    r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
    market_service = MarketDataService()
    
    # 2. Find CSVs in resources/
    resources_dir = os.path.join(os.path.dirname(__file__), 'resources')
    if not os.path.exists(resources_dir):
        print(f"Resources directory not found: {resources_dir}")
        return

    csv_files = [f for f in os.listdir(resources_dir) if f.endswith('.csv')]
    if not csv_files:
        print("No CSV files found in resources/")
        return
        
    all_tickers = []
    
    # 3. Read all tickers
    for csv_file in csv_files:
        path = os.path.join(resources_dir, csv_file)
        print(f"Reading {csv_file}...")
        try:
            df = pd.read_csv(path)
            if 'Symbol' in df.columns:
                tickers = df['Symbol'].tolist()
                print(f"Found {len(tickers)} tickers in {csv_file}")
                all_tickers.extend(tickers)
            else:
                print(f"Skipping {csv_file}: No 'Symbol' column found")
        except Exception as e:
            print(f"Error reading {csv_file}: {e}")

    # Remove duplicates
    all_tickers = list(set(all_tickers))
    print(f"Total unique tickers to load: {len(all_tickers)}")
    
    if not all_tickers:
        return

    # 4. Batch fetch prices
    # We'll chunk the tickers because fetching 500+ might be too much for a single yfinance call sometimes,
    # though MarketDataService handles it, explicit chunking is safer for logging progress.
    CHUNK_SIZE = 100
    total_chunks = (len(all_tickers) + CHUNK_SIZE - 1) // CHUNK_SIZE
    
    # Prepare Redis Pipeline
    pipeline = r.pipeline()
    r.delete(config.REDIS_KEY_TICKERS) 
    
    # Add all tickers to index
    pipeline.sadd(config.REDIS_KEY_TICKERS, *all_tickers)
    
    for i in range(0, len(all_tickers), CHUNK_SIZE):
        chunk = all_tickers[i:i + CHUNK_SIZE]
        print(f"Fetching prices for chunk {i//CHUNK_SIZE + 1}/{total_chunks} ({len(chunk)} tickers)...")
        
        # Helper synchronous wrapper call since we are in async function but service has sync/async
        # MarketDataService has get_current_prices (sync) and get_current_prices_async (async)
        prices = await market_service.get_current_prices_async(chunk)
        
        for ticker in chunk:
            price = prices.get(ticker)
            if not price or str(price) == 'nan':
                 price = 100.0 # Default fallback
            else:
                 price = float(price)

            # Determine market based on suffix logic from service or filename?
            # Service has heuristic. Let's rely on string check for now.
            market = "IN" if ".NS" in ticker or ".BO" in ticker else "US"

            position = Position(
                ticker=ticker,
                quantity=10000, # Default quantity
                market=market,
                avg_price=price,
                current_price=price,
                pnl=0.0
            )
            
            key = f"marketmaker:position:{ticker}"
            mapping = {
                "ticker": position.ticker,
                "quantity": position.quantity,
                "market": position.market,
                "avg_price": position.avg_price,
                "current_price": position.current_price,
                "pnl": position.pnl
            }
            pipeline.hset(key, mapping=mapping)
            
    print("Executing Redis pipeline...")
    pipeline.execute()
    print("Data loading complete!")

if __name__ == "__main__":
    asyncio.run(load_data())
