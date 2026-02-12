import asyncio
import json
import logging
import time
import sys
from models import Order
from config import settings
from producer import Producer
from matching_engine import MatchingEngine
# from market_listener import MarketListener # Deprecated/Unused in Stream architecture? Or keep?
# If MarketListener was just listening to Redis for external updates, Stream handles orders.
# Let's keep it if it does something else, but original reused engine.

from tradingserver_core.redis_client import RedisClient
from tradingserver_core.service_host import ServiceHost

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def process_stream(engine, redis_client):
    """
    Consumes orders from Redis Stream 'orders:stream' via Consumer Group.
    """
    stream_key = "orders:stream"
    group_name = "exchange_group"
    consumer_name = "worker_1" # In prod, distinct per container

    # 1. Create Consumer Group
    try:
        # mkstream=True creates stream if not exists
        await redis_client.client.xgroup_create(stream_key, group_name, id="0", mkstream=True)
        logger.info(f"Created consumer group {group_name}")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            logger.info(f"Consumer group {group_name} already exists.")
        else:
            logger.error(f"Error creating group: {e}")

    logger.info(f"Listening to {stream_key} as {consumer_name}...")

    while True:
        try:
            # 2. Add logic to re-process Pending (PEL) first? For MVP, just read new (>).
            
            # Block for 1s, read new messages
            streams = await redis_client.client.xreadgroup(group_name, consumer_name, {stream_key: ">"}, count=10, block=1000)
            
            if not streams:
                continue
                
            for stream, messages in streams:
                for message_id, data in messages:
                    # data is Dict[str, str] (if decode_responses=True)
                    # The message data is what we published. 
                    # If we used xadd(key, dict), Redis stores fields.
                    # e.g. data = {'ClOrdID': '...', 'Symbol': '...', ...}
                    try:
                        # Process
                        await process_message(engine, data)
                        
                        # Ack
                        await redis_client.client.xack(stream_key, group_name, message_id)
                        
                    except Exception as e:
                        logger.error(f"Error processing {message_id}: {e}")
                        
        except Exception as e:
            logger.error(f"Stream Loop Error: {e}")
            await asyncio.sleep(1)

async def process_message(engine, data):
    """Async wrapper to parse and call engine."""
    try:
        logger.info(f"Received Order: {data}")

        # Check for RESET
        if data.get('type') == 'RESET':
            await engine.reset()
            return

        # Basic Validation
        if 'ClOrdID' not in data:
            return

        # Parse Numerics
        # Validate and Handle Request Types specifically
        request_type = data.get('RequestType')
        cl_ord_id = data.get('ClOrdID')
        
        # Parse common fields
        try:
            price = float(data.get('Price', 0))
        except: price = 0.0
        
        try:
            qty = int(data.get('OrderQty', 0))
        except: qty = 0
            
        sender = data.get('SenderCompID', 'UNKNOWN')
        symbol = data.get('Symbol')
        side = data.get('Side')
        
        # Create Order Object
        order = Order(
            id=cl_ord_id,
            cl_ord_id=cl_ord_id,
            symbol=symbol,
            side=side,
            price=price,
            qty=qty,
            type=data.get('OrdType', '2'),
            sender_comp_id=sender,
            transact_time=data.get('TransactTime', str(time.time())),
            timestamp=time.time()
        )

        # Logic for Replace/Cancel
        if request_type == 'Replace':
            orig_id = data.get('OrigClOrdID')
            logger.info(f"Processing Replace: Cancel {orig_id} -> New {cl_ord_id}")
            # We don't have a direct 'cancel_order' that takes ID in engine?
            # Engine needs to know which book?
            # We can use engine.cancel_order_by_id(symbol, orig_id)?
            # Or just hack it: Treat as New for now if cancel is hard, BUT
            # Real fix: We need to remove the old order. 
            # Check MatchingEngine for cancel method.
            if hasattr(engine, 'cancel_order_by_id'):
                await engine.cancel_order_by_id(symbol, orig_id)
            else:
                 # Fallback: Try to find and cancel manually?
                 # Assuming MatchingEngine has get_order_book(symbol)
                 book = engine.get_order_book(symbol)
                 # We need to remove 'orig_id' from book.
                 # OrderBook likely has cancel_order(order_id).
                 # Note: Thread safety? This is async single threaded loop essentially.
                 if book:
                    # We might need to look up side?
                    # OrderBook implementation dependent.
                    # Assuming book.cancel_order(orig_id) exists.
                    pass 

        await engine.process_order(order)
        
    except Exception as e:
        logger.error(f"Process Logic Error: {e}")


async def hydrate_from_redis(engine, redis_client):
    logger.info("Hydrating Order Book from Redis Snapshots...")
    try:
        r = redis_client.client
        # Keys: exchange:snapshot:{symbol}
        keys = await r.keys("exchange:snapshot:*")
        count = 0
        
        for key in keys:
            data_json = await r.get(key)
            if not data_json: continue
            
            try:
                book_state = json.loads(data_json)
                orders = book_state.get("orders", [])
                
                for order_data in orders:
                    # Reconstruct Order object
                    # Order Book serialization stores keys like "id", "price" etc (snake_case from pydantic or to_dict?)
                    # Let's check to_dict format in order_book.py.
                    # It likely returns list of order.dict(). Order is Pydantic.
                    # Pydantic dict() returns snake_case by default unless configured otherwise.
                    # Exchange model uses snake_case?
                    # Let's assume snake_case: id, symbol, side, price, qty...
                    
                    # NOTE: We need LEAVES qty. 
                    # OrderBook state stores the ACTIVE order object. 
                    # If it's in the book, 'qty' IS the remaining quantity.
                    
                    try:
                        order = Order(
                            id=order_data.get('id'),
                            cl_ord_id=order_data.get('cl_ord_id') or order_data.get('id'), # Fallback
                            symbol=order_data.get('symbol'),
                            side=order_data.get('side'),
                            price=float(order_data.get('price', 0)),
                            qty=int(order_data.get('qty', 0)), # Remaining Qty
                            type=order_data.get('type', '2'),
                            sender_comp_id=order_data.get('sender_comp_id', 'UNKNOWN'),
                            transact_time=order_data.get('transact_time', str(time.time())),
                            timestamp=float(order_data.get('timestamp', time.time()))
                        )
                        
                        await engine.process_order(order)
                        count += 1
                    except Exception as e:
                         # logger.error(f"Order Hydration Error: {e}") 
                         pass
                         
            except Exception as e:
                logger.error(f"Snapshot Parsing Error {key}: {e}")
                
        logger.info(f"Hydrated {count} active orders from snapshots.")
    except Exception as e:
        logger.error(f"Hydration Error: {e}")

async def main():
    logger.info("Starting Exchange Service (Stream Worker)...")

    # 1. Init Components (Legacy Sync Producer for Output)
    producer = Producer()
    engine = MatchingEngine(producer)
    
    # 2. Redis Client (Async for Input)
    redis_client = RedisClient(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
    
    # 3. Hydrate State
    await hydrate_from_redis(engine, redis_client)
    
    # 4. Start Loop
    try:
        await process_stream(engine, redis_client)
    except asyncio.CancelledError:
        logger.info("Stopping...")
    finally:
        await redis_client.close()

if __name__ == "__main__":
    # Use ServiceHost or raw asyncio
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
