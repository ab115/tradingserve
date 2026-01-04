import unittest
import time
from unittest.mock import MagicMock
from models import Order
from order_book import OrderBook

class TestOrderBook(unittest.TestCase):
    def setUp(self):
        self.book = OrderBook("AAPL")

    def create_order(self, oid, side, price, qty, type='2', timestamp=None):
        if timestamp is None:
            timestamp = time.time()
        return Order(
            id=oid, cl_ord_id=oid, symbol="AAPL", side=side, price=price, qty=qty, 
            type=type, sender_comp_id="TEST", transact_time=str(timestamp), timestamp=timestamp
        )

    def test_add_buy_limit_rests(self):
        order = self.create_order("1", "Buy", 100, 10)
        trades = self.book.add_order(order)
        self.assertEqual(len(trades), 0)
        self.assertEqual(len(self.book.bids), 1)
        self.assertEqual(self.book.bids[0][2].id, "1")

    def test_match_buy_limit_against_sell(self):
        # Sell Limit 100 @ 10
        s1 = self.create_order("s1", "Sell", 100, 10)
        self.book.add_order(s1)
        
        # Buy Limit 100 @ 5
        b1 = self.create_order("b1", "Buy", 100, 5)
        trades = self.book.add_order(b1)
        
        self.assertEqual(len(trades), 1)
        maker, taker, qty, price = trades[0]
        self.assertEqual(maker.id, "s1")
        self.assertEqual(taker.id, "b1")
        self.assertEqual(qty, 5)
        self.assertEqual(price, 100)
        
        # Check Book State
        self.assertEqual(len(self.book.asks), 1) # s1 still there but partial
        self.assertEqual(self.book.asks[0][2].qty, 5)

    def test_price_priority_sell(self):
        # Sells @ 101, 100 (Best)
        s1 = self.create_order("s1", "Sell", 101, 10)
        s2 = self.create_order("s2", "Sell", 100, 10)
        self.book.add_order(s1)
        self.book.add_order(s2)
        
        # Buy @ 102 (Crosses both)
        b1 = self.create_order("b1", "Buy", 102, 15)
        trades = self.book.add_order(b1)
        
        self.assertEqual(len(trades), 2)
        # First trade should be with s2 (Price 100)
        self.assertEqual(trades[0][0].id, "s2")
        self.assertEqual(trades[0][3], 100) # Execution Price matches Maker
        self.assertEqual(trades[0][2], 10)
        
        # Second trade with s1 (Price 101)
        self.assertEqual(trades[1][0].id, "s1")
        self.assertEqual(trades[1][3], 101)
        self.assertEqual(trades[1][2], 5)

    def test_market_buy_order(self):
        s1 = self.create_order("s1", "Sell", 100, 100)
        self.book.add_order(s1)
        
        b1 = self.create_order("b1", "Buy", 0, 50, type='1') # Market
        trades = self.book.add_order(b1)
        
        self.assertEqual(len(trades), 1)
        self.assertEqual(trades[0][2], 50)
        self.assertEqual(trades[0][3], 100)

if __name__ == '__main__':
    unittest.main()
