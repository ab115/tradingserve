export interface OrderBookLevel {
    price: number;
    qty: number;
    total: number;
    entity?: string;
}

export interface Trade {
    id: string;
    price: number;
    qty: number;
    side: string;
    timestamp: string;
    symbol: string;
    buyer: string;
    seller: string;
}
