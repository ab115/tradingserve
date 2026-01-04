import json
import logging
import time
import sys
from models import Order
from config import settings
from producer import Producer
from matching_engine import MatchingEngine
from market_listener import MarketListener

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting Exchange Service...")
    
    # 1. Initialize Components
    producer = Producer()
    engine = MatchingEngine(producer)
    
    # 2. Start Market Data Listener
    market_listener = MarketListener(engine)
    market_listener.start()
    
    # 3. Connect to Redis for Order Stream
    # We reuse the redis connection from producer for simplicity, or create new
    r = producer.redis
    pubsub = r.pubsub()
    pubsub.subscribe(settings.REDIS_ORDER_CHANNEL)
    
    logger.info(f"Subscribed to {settings.REDIS_ORDER_CHANNEL}")
    
    try:
        # 4. Main Loop
        for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    data = json.loads(message['data'])
                    logger.info(f"Received Order: {data}")
                    
                    # Check for RESET command
                    if data.get('type') == 'RESET':
                        engine.reset()
                        continue

                    # 5. Parse Order
                    # Check if it's a valid order message (basic check)
                    if 'ClOrdID' not in data or 'Symbol' not in data:
                        continue
                        
                    # Map to Order Model
                    # Note: Convert numeric fields
                    try:
                        price = float(data.get('Price', 0))
                    except (ValueError, TypeError):
                        price = 0.0
                        
                    try:
                        qty = int(data.get('OrderQty', 0))
                    except (ValueError, TypeError):
                        qty = 0
                    
                    if qty <= 0:
                        logger.warning(f"Ignoring order with invalid qty: {qty}")
                        continue

                    # Handle Side
                    # FixApp sends "Buy" or "Sell" string
                    side_str = data.get('Side')
                    if side_str not in ['Buy', 'Sell']:
                         logger.warning(f"Unknown side: {side_str}")
                         continue
                         
                    order = Order(
                        id=data.get('ClOrdID'), # Use ClOrdID as ID for now
                        cl_ord_id=data.get('ClOrdID'),
                        symbol=data.get('Symbol'),
                        side=side_str,
                        price=price,
                        qty=qty,
                        type=data.get('OrdType', '2'), # Default to Limit if missing? Or error?
                        sender_comp_id=data.get('SenderCompID', 'UNKNOWN'),
                        transact_time=data.get('TransactTime', str(time.time())),
                        timestamp=time.time()
                    )
                    
                    # 6. Process
                    engine.process_order(order)
                    
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        market_listener.stop()
        market_listener.join()

if __name__ == "__main__":
    main()
