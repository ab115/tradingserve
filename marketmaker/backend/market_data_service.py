import redis
import os
import logging
from typing import List

logger = logging.getLogger("MarketDataService")

# comprehensive list of top tickers to simulate "all active" for the demo
# ensuring we have a good mix of US and Indian stocks
US_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "BRK-B", "JPM", "V",
    "JNJ", "WMT", "PG", "MA", "UNH", "DIS", "HD", "BAC", "XOM", "KO"
]

INDIA_TICKERS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS",
    "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS",
    "LICI.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "HCLTECH.NS"
]

import config

class MarketDataService:
    def __init__(self):
        self.redis = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)

    def get_active_tickers(self) -> List[dict]:
        """
        Returns a list of tickers with their market.
        """
        tickers = []
        for t in US_TICKERS:
            tickers.append({"ticker": t, "market": "US"})
        
        for t in INDIA_TICKERS:
            tickers.append({"ticker": t, "market": "IN"})
            
        return tickers

    async def get_current_prices_async(self, tickers: List[str]):
        """
        Fetches current prices asynchronously.
        For Redis, we can just call the sync version since it's fast, 
        or use a thread pool if needed. Given Redis speed, direct call in worker is fine,
        but to keep signature:
        """
        return self.get_current_prices(tickers)

    def get_current_prices(self, tickers: List[str]):
        """
        Fetches current prices for a list of tickers from Redis.
        Format in Redis: market_data:{ticker} -> hash with field 'price'
        """
        if not tickers:
            return {}

        pipeline = self.redis.pipeline()
        for t in tickers:
            pipeline.hget(f"market_data:{t}", "price")
        
        results = pipeline.execute()
        
        prices = {}
        for i, price in enumerate(results):
            if price:
                try:
                    prices[tickers[i]] = float(price)
                except ValueError:
                    pass
            # If not in Redis, we could maybe return a default or just skip
            # For this demo, let's skip
            
        return prices

    async def get_ticker_info(self, ticker: str):
        """
        Fetches details for a single ticker.
        """
        prices = self.get_current_prices([ticker])
        price = prices.get(ticker, 100.0) # Default/Fallback
        
        # Simple market inference
        market = "IN" if ".NS" in ticker or ".BO" in ticker else "US"
        
        return {
            "ticker": ticker,
            "price": price,
            "market": market
        }
