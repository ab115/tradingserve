import heapq
import time
from typing import List, Tuple, Optional
from models import Order

class OrderBook:
    def __init__(self, symbol: str):
        self.symbol = symbol
        # Bids: Max-Heap (stores (-price, timestamp, order))
        # We negate price because heapq is a min-heap. 
        # Higher price = Lower negative number = Popped first.
        self.bids: List[Tuple[float, float, Order]] = []
        
        # Asks: Min-Heap (stores (price, timestamp, order))
        # Lower price = Popped first.
        self.asks: List[Tuple[float, float, Order]] = []

    def add_order(self, order: Order) -> Tuple[List[Tuple[Order, Order, int, float]], List[Order]]:
        """
        Processes a new order.
        Returns (trades, cancelled_orders)
        """
        trades = []
        cancelled = []
        
        if order.side == 'Buy':
            trades, cancelled = self._match_buy_order(order)
        else:
            trades, cancelled = self._match_sell_order(order)
            
        return trades, cancelled

    def _match_buy_order(self, order: Order) -> Tuple[List[Tuple[Order, Order, int, float]], List[Order]]:
        trades = []
        cancelled = []
        
        # Look at Asks (lowest sell price first)
        while self.asks and order.qty > 0:
            best_ask_price, _, best_ask_order = self.asks[0]
            
            # Self-Match Prevention (Cancel Resting)
            if best_ask_order.sender_comp_id == order.sender_comp_id:
                heapq.heappop(self.asks)
                cancelled.append(best_ask_order)
                continue
            
            # Check Match Condition
            is_match = False
            if order.type == '1': # Market Order
                is_match = True
            elif order.type == '2': # Limit Order
                if order.price >= best_ask_price:
                    is_match = True
            
            if is_match:
                # Execute Trade
                exec_qty = min(order.qty, best_ask_order.qty)
                exec_price = best_ask_price # Taker pays Maker's price
                
                trades.append((best_ask_order, order, exec_qty, exec_price))
                
                # Update Quantities
                order.qty -= exec_qty
                best_ask_order.qty -= exec_qty
                
                # Remove Maker if filled
                if best_ask_order.qty == 0:
                    heapq.heappop(self.asks)
            else:
                # No overlap, stop matching
                break
        
        # Resting Logic
        if order.qty > 0:
            if order.type == '2': # Limit Order
                # Add to Bids
                # Priority: Price (High), then Time (Low)
                # Store (-price, timestamp, order)
                heapq.heappush(self.bids, (-order.price, order.timestamp, order))
            elif order.type == '1': # Market Order
                # Cancel remainder (Kill)
                # TODO: Implement optional FOK/IOC logic if needed, strictly "Kill" for now
                pass
                
        return trades, cancelled

    def _match_sell_order(self, order: Order) -> Tuple[List[Tuple[Order, Order, int, float]], List[Order]]:
        trades = []
        cancelled = []
        
        # Look at Bids (highest buy price first)
        while self.bids and order.qty > 0:
            # Pop best bid: (-price, timestamp, order)
            neg_best_bid_price, _, best_bid_order = self.bids[0]
            best_bid_price = -neg_best_bid_price
            
            # Self-Match Prevention (Cancel Resting)
            if best_bid_order.sender_comp_id == order.sender_comp_id:
                heapq.heappop(self.bids)
                cancelled.append(best_bid_order)
                continue
            
            # Check Match Condition
            is_match = False
            if order.type == '1': # Market Order
                is_match = True
            elif order.type == '2': # Limit Order
                if order.price <= best_bid_price:
                    is_match = True
            
            if is_match:
                # Execute Trade
                exec_qty = min(order.qty, best_bid_order.qty)
                exec_price = best_bid_price # Taker sells at Maker's bid
                
                trades.append((best_bid_order, order, exec_qty, exec_price))
                
                # Update Quantities
                order.qty -= exec_qty
                best_bid_order.qty -= exec_qty
                
                # Remove Maker if filled
                if best_bid_order.qty == 0:
                    heapq.heappop(self.bids)
            else:
                break
        
        # Resting Logic
        if order.qty > 0:
            if order.type == '2': # Limit Order
                # Add to Asks
                # Priority: Price (Low), then Time (Low)
                heapq.heappush(self.asks, (order.price, order.timestamp, order))
            elif order.type == '1': # Market Order
                pass
                
        return trades, cancelled

    def to_dict(self) -> dict:
        """
        Serializes the current state of the order book.
        Returns list of all active orders to allow frontend hydration.
        """
        active_orders = []
        
        # Bids (Max Heap: -price, timestamp, order)
        for _, _, order in self.bids:
            active_orders.append(order.dict())
            
        # Asks (Min Heap: price, timestamp, order)
        for _, _, order in self.asks:
            active_orders.append(order.dict())
            
        return {
            "symbol": self.symbol,
            "orders": active_orders
        }

    def get_aggregated_book(self, depth: int = 20) -> dict:
        """
        Returns the Order Book aggregated by price levels.
        Used for efficient Market Data broadcasting.
        """
        # Aggregate Bids
        # Key: (price, sender_comp_id)
        bid_levels = {}
        for neg_price, _, order in self.bids:
            price = -neg_price
            qty = order.qty
            entity = order.sender_comp_id or "Anonymous"
            key = (price, entity)
            
            if key not in bid_levels:
                bid_levels[key] = 0
            bid_levels[key] += qty
            
        # Sort Bids (High to Low Price)
        # We need to sort by Price Descending. Secondary sort? Maybe Entity name?
        sorted_keys = sorted(bid_levels.keys(), key=lambda x: (x[0], x[1]), reverse=True) 
        # Note: sort key (x[0], x[1]) with reverse=True sorts Price DESC, then Entity DESC.
        
        sorted_bids = []
        # Take top N *levels* (combinations)
        for price, entity in sorted_keys[:depth]:
            sorted_bids.append({
                "price": price, 
                "qty": bid_levels[(price, entity)], 
                "total": 0,
                "entity": entity
            })
            
        # Aggregate Asks
        ask_levels = {}
        for price, _, order in self.asks:
            qty = order.qty
            entity = order.sender_comp_id or "Anonymous"
            key = (price, entity)
            
            if key not in ask_levels:
                ask_levels[key] = 0
            ask_levels[key] += qty
            
        # Sort Asks (Low to High Price)
        # Reverse=False. Sorts Price ASC, Entity ASC.
        sorted_keys_asks = sorted(ask_levels.keys(), key=lambda x: (x[0], x[1]))
        
        sorted_asks = []
        for price, entity in sorted_keys_asks[:depth]:
            sorted_asks.append({
                "price": price, 
                "qty": ask_levels[(price, entity)], 
                "total": 0,
                "entity": entity
            })

        return {
            "type": "BOOK_SNAPSHOT",
            "symbol": self.symbol,
            "bids": sorted_bids,
            "asks": sorted_asks,
            # We can optionally include last_price if we tracked it, but API fetches it from Redis separately
        }
