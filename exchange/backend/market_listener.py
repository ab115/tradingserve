import json
import logging
import threading
from config import settings
from matching_engine import MatchingEngine
from producer import Producer # Just for type hinting if needed

logger = logging.getLogger(__name__)

class MarketListener(threading.Thread):
    def __init__(self, engine: MatchingEngine):
        super().__init__()
        self.engine = engine
        self.redis = self.engine.producer.redis # Reuse connection from producer
        self.pubsub = self.redis.pubsub()
        self.pubsub.subscribe(settings.MARKET_DATA_CHANNEL)
        self.running = True

    def run(self):
        logger.info(f"Listening for market data on {settings.MARKET_DATA_CHANNEL}")
        for message in self.pubsub.listen():
            if not self.running:
                break
                
            if message['type'] == 'message':
                try:
                    data = json.loads(message['data'])
                    # Expecting data to have 'ticker' and 'price'
                    ticker = data.get('ticker')
                    price = data.get('price')
                    
                    if ticker and price:
                        try:
                            f_price = float(price)
                            self.engine.update_market_price(ticker, f_price)
                        except ValueError:
                            pass
                except Exception as e:
                    logger.error(f"Error processing market data: {e}")

    def stop(self):
        self.running = False
        self.pubsub.unsubscribe()
