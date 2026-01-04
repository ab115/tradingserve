from abc import ABC, abstractmethod
from typing import Tuple, Optional

class MarketMakingStrategy(ABC):
    """
    Abstract Base Class for all Market Making Strategies.
    Separates the trading logic (Strategy) from the execution (FIX Client).
    """

    def __init__(self, ticker: str):
        self.ticker = ticker
        # State
        self.mid_price = 0.0
        self.inventory = 0
        self.volatility = 0.0

    def on_market_data_update(self, ticker: str, mid_price: float):
        """Called when reference price changes."""
        if ticker == self.ticker:
            self.mid_price = mid_price

    def on_inventory_update(self, ticker: str, quantity: int):
        """Called when we get a fill (Inventory changes)."""
        if ticker == self.ticker:
            self.inventory = quantity

    def update_volatility(self, vol: float):
         self.volatility = vol

    @abstractmethod
    def calculate_quotes(self) -> Tuple[Optional[float], Optional[float]]:
        """
        Returns the desired (Bid, Ask) prices.
        Return None to indicate no quote.
        """
        pass

    def set_parameters(self, params: dict):
        """
        Update strategy parameters dynamically.
        Override this in subclasses to handle specific parameters.
        """
        pass
