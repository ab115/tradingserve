from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class Order(BaseModel):
    id: str  # Internal Order ID (often same as ClOrdID or derived)
    cl_ord_id: str
    symbol: str
    side: Literal['Buy', 'Sell']
    price: float = 0.0 # 0 for Market? Or Optional
    qty: int
    type: Literal['1', '2'] # '1': Market, '2': Limit (matches FIX 4.2 OrdType)
    status: str = 'New'
    cum_qty: int = 0
    sender_comp_id: str
    transact_time: str
    
    # Internal usage
    timestamp: float = 0.0 # For priority

class ExecutionReport(BaseModel):
    OrderID: str
    ClOrdID: str
    ExecID: str
    Symbol: str
    Side: str
    OrdStatus: str
    ExecType: str
    LeavesQty: int
    LastQty: int
    CumQty: int
    AvgPx: float
    TargetCompID: str
    SenderCompID: str
    TransactTime: str
    ContraParty: Optional[str] = None
