from .base import MarketMakingStrategy
from typing import Tuple, Optional

class ConstantSpreadStrategy(MarketMakingStrategy):
    """
    Quotes a fixed spread around Middle Price.
    Naive strategy. Does not care about inventory risk.
    """
    def __init__(self, ticker: str, spread: float = 0.10):
        super().__init__(ticker)
        self.spread = spread

    def calculate_quotes(self) -> Tuple[Optional[float], Optional[float]]:
        if self.mid_price <= 0:
            return None, None

        half_spread = self.spread / 2
        bid = round(self.mid_price - half_spread, 2)
        ask = round(self.mid_price + half_spread, 2)
        
        return bid, ask
