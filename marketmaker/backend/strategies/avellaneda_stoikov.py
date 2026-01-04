from .base import MarketMakingStrategy
from typing import Tuple, Optional
import math

class AvellanedaStoikovStrategy(MarketMakingStrategy):
    """
    Simplified Avellaneda-Stoikov Strategy.
    Adjusts quotes based on Inventory Risk (Gamma) and Volatility (Sigma).
    """
    def __init__(self, ticker: str, gamma: float = 0.1, sigma: float = 0.5):
        super().__init__(ticker)
        self.gamma = gamma # Risk Aversion
        self.sigma = sigma # Volatility
        self.k = 1.5       # Order Book Liquidity Parameter (Const for now)
    
    def calculate_quotes(self) -> Tuple[Optional[float], Optional[float]]:
        if self.mid_price <= 0:
            return None, None
            
        # 1. Calculate Reservation Price (r)
        # r = s - q * gamma * sigma^2 * T (let T=1 for simplicity/infinite horizon proxy)
        # Meaning: If we are Long (q > 0), we lower our fair price to encourage selling.
        # If we are Short (q < 0), we raise our fair price to encourage buying.
        
        # Scaling gamma down because our quantity is large (e.g. 100,000)
        # If q=100,000, we need gamma to be very small or q to be normalized.
        # Let's normalize q by 1000 for this calculation or use a tiny gamma.
        # Let's use a normalized inventory approach: q_norm = inventory / 1000
        
        q_norm = self.inventory / 10000.0
        reservation_price = self.mid_price - (q_norm * self.gamma * (self.sigma ** 2))
        
        # 2. Calculate Spread (Half Spread)
        # Optimal spread involves log terms of liquidity (k).
        # Simplified: Spread = gamma * sigma^2 + (2/options) * ln(1 + gamma/k)
        # Let's stick to a simpler heuristic for stability first:
        # Base spread + Volatility Premium
        
        half_spread = (self.gamma * (self.sigma ** 2)) + (0.05) # Fixed min spread component
        
        # Ensure minimum tick size validity
        if half_spread < 0.01:
            half_spread = 0.01
            
        bid = round(reservation_price - half_spread, 2)
        ask = round(reservation_price + half_spread, 2)
        
        # Safety: Don't cross
        if bid >= ask:
             ask = bid + 0.01
             
        # Safety: Don't quote negative
        if bid <= 0:
            bid = 0.01
            
        return bid, ask

    def set_parameters(self, params: dict):
        if 'gamma' in params:
            self.gamma = float(params['gamma'])
        if 'sigma' in params:
            self.sigma = float(params['sigma'])
