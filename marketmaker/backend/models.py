from pydantic import BaseModel
from typing import Optional

class Position(BaseModel):
    ticker: str
    quantity: int
    market: str  # 'US' or 'IN'
    avg_price: float
    current_price: Optional[float] = 0.0
    pnl: Optional[float] = 0.0

class PositionUpdate(BaseModel):
    ticker: str
    quantity_change: int
    price: float

class PositionCreate(BaseModel):
    ticker: str
