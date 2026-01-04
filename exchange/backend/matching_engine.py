import logging
import uuid
import time
from typing import Dict
from models import Order, ExecutionReport
from order_book import OrderBook
from producer import Producer

logger = logging.getLogger(__name__)

class MatchingEngine:
    def __init__(self, producer: Producer):
        self.order_books: Dict[str, OrderBook] = {}
        self.producer = producer
        self.market_prices: Dict[str, float] = {}

    def get_order_book(self, symbol: str) -> OrderBook:
        if symbol not in self.order_books:
            self.order_books[symbol] = OrderBook(symbol)
        return self.order_books[symbol]

    def update_market_price(self, symbol: str, price: float):
        self.market_prices[symbol] = price
        # Could trigger Stop orders here

    def process_order(self, order: Order):
        book = self.get_order_book(order.symbol)
        
        if order.status == 'New':
             # Publish "New Order" event for UI/OrderBook
             # Convert order to dict. Pydantic .dict()
             self.producer.publish_order_update(order.dict())

        # 1. Match
        trades, cancelled_orders = book.add_order(order)
        
        # 2. Process Trades (Execution Reports)
        for maker, taker, qty, price in trades:
            self._handle_trade(maker, taker, qty, price)

        # 2b. Process Self-Match Cancellations
        for cancelled_order in cancelled_orders:
             logger.info(f"Self-match prevention triggered for {cancelled_order.id}")
             self._send_cancel(cancelled_order, "Self-Match Prevention")
            
        # 3. Publish Snapshot (Persistence)
        # For high-frequency, we wouldn't do this *every* order, but for this demo/MVP it ensures consistent state.
        self._publish_snapshot(book)
            
        # 3. Process Taker Rest (if Limit and not fully filled)
        # If it was a Market order and not fully filled, the remainder was killed by OrderBook logic
        # But we need to report the New/Open status for the resting portion?
        # The OrderBook updates the objects directly.
        
        # Check Taker Status after matching
        if order.status == 'New':
             # If it wasn't rejected immediately and had some matches or resting
             pass
        
        # If Limit order rests in book (partially or fully open), we might want to send 'New' report if not already sent?
        # Typically:
        # - Send 'New' (Ack) immediately upon receipt? Or after matching?
        # - If immediate Match, send 'PartialFill' or 'Fill'.
        # - If resting, send 'New'.
        
        # Let's simple approach:
        # Acknowledge Receipt
        # self._send_ack(order) # Maybe assume Gateway did this? ECnGateway usually sends 'PendingNew' then 'New'.
        # Here we are the venue. We should confirm 'New'.
        
        # NOTE: If the order was a Market order and has remainder, it is effectively Dead for the remainder.
        # Required to send 'Expired' or 'Cancelled' for remainder?
        if order.type == '1' and order.qty > 0:
             self._send_cancel(order, "Market Order Partial Fill / No Liquidity")

    def reset(self):
        """Clears all order books and state."""
        logger.info("Resetting Matching Engine State...")
        symbols = list(self.order_books.keys())
        self.order_books.clear()
        
        # Publish empty snapshots for all previously known symbols to clear UI
        for symbol in symbols:
            # Create fresh empty book
            empty_book = OrderBook(symbol)
            self._publish_snapshot(empty_book)
            
            # Also clear the trade history list in Redis
            try:
                self.producer.redis.delete(f"exchange:trades:{symbol}")
            except Exception as e:
                logger.error(f"Failed to clear trade history for {symbol}: {e}")

    def _publish_snapshot(self, book: OrderBook):
        snapshot = book.to_dict()
        self.producer.publish_snapshot(snapshot)

    def _handle_trade(self, maker: Order, taker: Order, qty: int, price: float):
        match_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Maker Report
        maker.cum_qty += qty
        maker_leaves = maker.qty # Already updated in book
        maker_status = 'Filled' if maker_leaves == 0 else 'PartiallyFilled'
        
        maker_report = ExecutionReport(
            OrderID=maker.id,
            ClOrdID=maker.cl_ord_id,
            ExecID=match_id + "_M",
            Symbol=maker.symbol,
            Side=maker.side,
            OrdStatus=maker_status,
            ExecType='Fill' if maker_status == 'Filled' else 'PartialFill',
            LeavesQty=maker_leaves,
            LastQty=qty,
            CumQty=maker.cum_qty,
            AvgPx=price, # Simplified: AvgPx for this fill? Or total? FIX says AvgPx of *total* fills. 
                         # For MVP, let's use current fill price or we need to track total cost.
            TargetCompID=maker.sender_comp_id,
            SenderCompID="ECNGATEWAY",
            TransactTime=timestamp,
            ContraParty=taker.sender_comp_id
        )
        self.producer.publish_execution_report(maker_report)
        
        # Taker Report
        taker.cum_qty += qty
        taker_leaves = taker.qty 
        taker_status = 'Filled' if taker_leaves == 0 else 'PartiallyFilled'
        
        taker_report = ExecutionReport(
            OrderID=taker.id,
            ClOrdID=taker.cl_ord_id,
            ExecID=match_id + "_T",
            Symbol=taker.symbol,
            Side=taker.side,
            OrdStatus=taker_status,
            ExecType='Fill' if taker_status == 'Filled' else 'PartialFill',
            LeavesQty=taker_leaves,
            LastQty=qty,
            CumQty=taker.cum_qty,
            AvgPx=price,
            TargetCompID=taker.sender_comp_id,
            SenderCompID="ECNGATEWAY",
            TransactTime=timestamp,
            ContraParty=maker.sender_comp_id
        )
        self.producer.publish_execution_report(taker_report)
        
        # Publish Market Data (Last Price)
        self.update_market_price(maker.symbol, price)
        self.producer.publish_market_data(maker.symbol, price)

        # Publish Trade History (Persistence)
        trade_data = {
            "id": match_id,
            "price": price,
            "qty": qty,
            "symbol": maker.symbol,
            "timestamp": timestamp,
            "buyer": taker.sender_comp_id if taker.side == "Buy" else maker.sender_comp_id,
            "seller": taker.sender_comp_id if taker.side == "Sell" else maker.sender_comp_id,
            "taker_side": taker.side
        }
        self.producer.publish_trade_history(maker.symbol, trade_data)

        logger.info(f"Matched {qty} @ {price} for {maker.symbol} ({maker.side} vs {taker.side})")

    def _send_cancel(self, order: Order, reason: str):
         # Send unsolicited cancel for remaining market qty
         report = ExecutionReport(
            OrderID=order.id,
            ClOrdID=order.cl_ord_id,
            ExecID=str(uuid.uuid4()),
            Symbol=order.symbol,
            Side=order.side,
            OrdStatus='Canceled',
            ExecType='Canceled',
            LeavesQty=0,
            LastQty=0,
            CumQty=order.cum_qty,
            AvgPx=0.0,
            TargetCompID=order.sender_comp_id,
            SenderCompID="ECNGATEWAY",
            TransactTime=datetime.utcnow().isoformat()
         )
         self.producer.publish_execution_report(report)

from datetime import datetime
