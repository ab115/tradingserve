import pandas as pd
import os
import asyncio
from typing import List, Dict
from yahooquery import Ticker
from config import RESOURCES_DIR

class MarketDataProvider:
    def __init__(self):
        self.tickers = self._load_tickers()
        print(f"Loaded {len(self.tickers)} tickers.")

    def _load_tickers(self) -> List[str]:
        tickers = []
        try:
            # Load Nifty 50
            nifty_path = os.path.join(RESOURCES_DIR, "nifty50.csv")
            if os.path.exists(nifty_path):
                df = pd.read_csv(nifty_path)
                col = 'Symbol' if 'Symbol' in df.columns else 'Ticker'
                if col in df.columns:
                    # Avoid double .NS if input already has it
                    tickers.extend([
                        str(t).strip() if str(t).strip().endswith('.NS') else f"{str(t).strip()}.NS"
                        for t in df[col].dropna().tolist()
                    ])
            
            # Load S&P 500
            sp500_path = os.path.join(RESOURCES_DIR, "sp500.csv")
            if os.path.exists(sp500_path):
                df = pd.read_csv(sp500_path)
                if 'Symbol' in df.columns:
                    tickers.extend(df['Symbol'].tolist())
                elif 'Ticker' in df.columns:
                    tickers.extend(df['Ticker'].tolist())
            
            # Fallback if empty/files missing (Development mode)
            if not tickers:
                tickers = ["AAPL", "GOOGL", "MSFT", "TSLA", "RELIANCE.NS", "TCS.NS"]
                
        except Exception as e:
            print(f"Error loading tickers: {e}")
            tickers = ["AAPL", "GOOGL", "MSFT", "TSLA"] # Fallback
            
        # Ensure Major Tech Stocks are ALWAYS present (for MM/Exchange Demo)
        tickers.extend(["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"])
        
        return list(set(tickers)) # Unique

    def get_tickers(self):
        return self.tickers

    async def fetch_prices_async(self, tickers: List[str]) -> List[Dict]:
        if not tickers:
            return []
            
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._fetch_prices, tickers)

    def _fetch_prices(self, tickers: List[str]) -> List[Dict]:
        updates = []
        fetched_data = {}
        
        # 1. Try YahooQuery
        try:
            # yahooquery handles batching efficiently
            yq = Ticker(tickers)
            data = yq.price 
            
            if isinstance(data, dict):
                for ticker, info in data.items():
                    if isinstance(info, dict):
                        price = info.get('regularMarketPrice')
                        if price:
                            import random
                            price = float(price) * random.uniform(0.9995, 1.0005)
                            fetched_data[ticker] = price
                            
        except Exception as e:
            print(f"YahooQuery failed: {e}")
            # Fallthrough to YFinance attempt
            
        # 2. Try YFinance (if YahooQuery failed or returned no data)
        # We check valid fetch count to decide if we need YF
        if not fetched_data:
            try:
                import yfinance as yf
                if len(tickers) > 0:
                    # Minimal fetch
                    data = yf.download(tickers, period="1d", interval="1m", progress=False)
                    
                    if not data.empty:
                        last_row = data.iloc[-1]
                        if 'Close' in last_row:
                            closes = last_row['Close']
                            
                            # Handle Single vs Multi-Index
                            if len(tickers) > 1:
                                for t in tickers:
                                    try:
                                        if t in closes:
                                            price = closes[t]
                                            if pd.notna(price):
                                                import random
                                                price = float(price) * random.uniform(0.9995, 1.0005)
                                                fetched_data[t] = price
                                    except:
                                        pass
                            else:
                                 # Single ticker, 'closes' is scalar or Series (depending on how yf returns single)
                                 # With group_by='ticker' it's diff, but default returns simple DF for single.
                                 try:
                                     # For single ticker, closes might be the price itself
                                     price = float(closes)
                                     if pd.notna(price):
                                         import random
                                         price = price * random.uniform(0.9995, 1.0005)
                                         fetched_data[tickers[0]] = price
                                 except:
                                     pass

            except Exception as e:
                print(f"YFinance failed: {e}")

        # Process and Simulate Missing
        import random
        
        # Initialize sim_prices
        if not hasattr(self, 'sim_prices'):
            self.sim_prices = {}

        for ticker in tickers:
            price = fetched_data.get(ticker)
            
            if price is None:
                # Simulation Logic
                last = self.sim_prices.get(ticker)
                if not last:
                    last = random.uniform(100, 1000)
                
                change = random.uniform(-0.005, 0.005)
                price = last * (1 + change)
                
            self.sim_prices[ticker] = price
            
            updates.append({
                "ticker": ticker,
                "price": round(price, 2),
                "timestamp": pd.Timestamp.now().isoformat()
            })
            
        return updates

    async def fetch_news_async(self, ticker: str) -> List[Dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._fetch_news, ticker)

    def _fetch_news(self, ticker: str) -> List[Dict]:
        clean_news = []
        
        # 1. Try YahooQuery
        try:
            from yahooquery import Ticker
            t = Ticker(ticker)
            news = t.news
            if callable(news): 
                news = news()
            
            if isinstance(news, list) and len(news) > 0:
                # Check if it's a valid list of dicts (failed yq sometimes returns ['error'])
                if isinstance(news[0], dict):
                    for item in news:
                        title = item.get('title', '')
                        if not title: continue
                        
                        clean_news.append({
                            'title': title,
                            'link': item.get('link', '#'),
                            'publisher': item.get('provider', {}).get('displayName', 'Yahoo Finance'),
                            'providerPublishTime': item.get('providerPublishTime', 0)
                        })
        except Exception as e:
            pass # Fallback to YFinance

        # 2. Try YFinance (if YahooQuery failed or returned empty)
        if not clean_news:
            try:
                import yfinance as yf
                t = yf.Ticker(ticker)
                news = t.news
                
                if isinstance(news, list) and len(news) > 0:
                    for item in news:
                        title = item.get('title', '')
                        if not title: continue
                             
                        # Access nested provider
                        publisher = 'Yahoo Finance'
                        if 'provider' in item and isinstance(item['provider'], dict):
                            publisher = item['provider'].get('displayName', publisher)
                        
                        clean_news.append({
                            'title': title,
                            'link': item.get('link', '#'),
                            'publisher': publisher,
                            'providerPublishTime': item.get('providerPublishTime', 0)
                        })
            except Exception:
                pass

        # 3. Fallback to Simulation (if both failed)
        if not clean_news:
            import time
            import random
            clean_news = [
                {
                    "title": f"Market Update: {ticker} sees increased volume",
                    "publisher": "MarketData Sim",
                    "link": "#",
                    "providerPublishTime": int(time.time())
                },
                {
                    "title": f"{ticker} Technical Analysis: Moving Averages align",
                    "publisher": "TradingView (Sim)",
                    "link": "#",
                    "providerPublishTime": int(time.time()) - 3600
                },
                 {
                    "title": f"Sector Report: Technology stocks rally",
                    "publisher": "Bloomberg (Sim)",
                    "link": "#",
                    "providerPublishTime": int(time.time()) - 7200
                }
            ]
            
        return clean_news

    async def fetch_sector_async(self, ticker: str) -> Dict:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._fetch_sector, ticker)

    def _fetch_sector(self, ticker: str) -> Dict:
        try:
            t = Ticker(ticker)
            profile = t.asset_profile
            # Profile is a dict keyed by ticker, or just data? 
            # yamhoquery asset_profile usually returns {ticker: {profile_data}}
            if isinstance(profile, dict):
                return profile.get(ticker, {})
            return {}
        except Exception as e:
            print(f"Error fetching sector for {ticker}: {e}")
            return {}
