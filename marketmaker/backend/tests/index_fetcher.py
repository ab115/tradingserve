import pandas as pd
import requests
import io

class IndexTickerFetcher:
    """
    Helper class to fetch ticker lists for major indices from Wikipedia.
    Useful for populating test data or initializing market maker universe.
    """
    
    def _fetch_url(self, url: str) -> str:
        """
        Helper to fetch content with a User-Agent to avoid 403 Forbidden.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return ""

    def get_sp500_tickers(self) -> list:
        """
        Fetches S&P 500 tickers from Wikipedia.
        Returns a list of strings compatible with yfinance (converts '.' to '-').
        """
        url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        html = self._fetch_url(url)
        if not html:
            return []

        try:
            # Pass the HTML string to read_html
            tables = pd.read_html(io.StringIO(html))
            
            # The first table is usually the S&P 500 constituents
            df = tables[0]
            
            # "Symbol" column contains the tickers
            if 'Symbol' not in df.columns:
                raise ValueError("Could not find 'Symbol' column in S&P 500 table")
                
            tickers = df['Symbol'].tolist()
            
            # Fix format: Wikipedia uses 'BF.B', yfinance uses 'BF-B'
            tickers = [t.replace('.', '-') for t in tickers]
            return tickers
            
        except Exception as e:
            print(f"Error parse S&P 500 table: {e}")
            return []

    def get_nifty50_tickers(self) -> list:
        """
        Fetches Nifty 50 tickers from Wikipedia.
        Returns a list of strings with '.NS' suffix for yfinance.
        """
        url = "https://en.wikipedia.org/wiki/Nifty_50"
        html = self._fetch_url(url)
        if not html:
            return []
            
        try:
            tables = pd.read_html(io.StringIO(html))
            
            # find table with "Symbol"
            df = None
            for table in tables:
                if 'Symbol' in table.columns:
                    df = table
                    break
            
            # Fallback for Nifty 50 page if 'Symbol' is not found, typically it is 'Symbol' 
            # but sometimes it can be the first table.
            if df is None and tables:
                 # Check first table columns
                 if 'Symbol' in tables[0].columns:
                     df = tables[0]
            
            if df is None:
                 raise ValueError("Could not find table with 'Symbol' column on Nifty 50 page")

            tickers = df['Symbol'].tolist()
            
            # Nifty tickers need .NS suffix for yfinance
            tickers = [f"{t}.NS" for t in tickers]
            return tickers
            
        except Exception as e:
            print(f"Error parse Nifty 50 table: {e}")
            return []

if __name__ == "__main__":
    # Quick self-test when run directly
    fetcher = IndexTickerFetcher()
    sp500 = fetcher.get_sp500_tickers()
    nifty = fetcher.get_nifty50_tickers()
    
    def save_to_csv(name, tickers):
        pd.DataFrame(tickers, columns=['Symbol']).to_csv(f"{name}.csv", index=False)
        print(f"Successfully saved {len(tickers)} tickers to {name}.csv")

    save_to_csv("sp500", sp500)
    save_to_csv("nifty50", nifty)
    
    print(f"Nifty 50 ({len(nifty)}): {nifty[:5]}...")
