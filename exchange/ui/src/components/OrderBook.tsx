import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { OrderBookLevel } from '../types';

interface OrderBookProps {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    symbol: string;
}

const OrderBookRow = ({ level, type, maxTotal }: { level: OrderBookLevel; type: 'bid' | 'ask'; maxTotal: number }) => {
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 500);
        return () => clearTimeout(timer);
    }, [level.qty, level.price]);

    return (
        <div className={clsx("relative flex justify-between font-mono text-xs py-0.5 px-2 hover:bg-bloomberg-panel transition-colors duration-200", flash && "bg-yellow-500/30")}>
            <div
                className={clsx("absolute top-0 bottom-0 opacity-10 transition-all duration-300", type === 'bid' ? "right-0 bg-green-500" : "left-0 bg-red-500")}
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
            />
            {type === 'bid' ? (
                <>
                    <span className="z-10 w-1/3 text-right text-bloomberg-text">{level.qty}</span>
                    <span className="z-10 w-1/3 text-center text-green-500">{level.price.toFixed(2)}</span>
                    <span className="z-10 w-1/3 text-left"></span>
                </>
            ) : (
                <>
                    <span className="z-10 w-1/3 text-right"></span>
                    <span className="z-10 w-1/3 text-center text-red-500">{level.price.toFixed(2)}</span>
                    <span className="z-10 w-1/3 text-left text-bloomberg-text">{level.qty}</span>
                </>
            )}
        </div>
    );
};

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, symbol }) => {
    const maxTotalCombined = Math.max(
        bids.length > 0 ? bids[bids.length - 1].total : 0,
        asks.length > 0 ? asks[asks.length - 1].total : 0
    );

    return (
        <div className="flex flex-col h-full bg-bloomberg-bg border border-bloomberg-border rounded-sm overflow-hidden text-sm">
            <div className="bg-bloomberg-panel px-2 py-1 border-b border-bloomberg-border font-bold text-bloomberg-orange flex justify-between">
                <span>{symbol}</span>
                <span className="text-xs text-bloomberg-text-dim">Order Book</span>
            </div>

            <div className="flex justify-between text-xs text-bloomberg-text-dim px-2 py-1 bg-bloomberg-bg border-b border-bloomberg-border">
                <span className="w-1/3 text-right">Bid Qty</span>
                <span className="w-1/3 text-center">Price</span>
                <span className="w-1/3 text-left">Ask Qty</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-bloomberg-border">
                {/* ASKS - Lowest Price at Bottom */}
                <div className="flex flex-col-reverse">
                    {asks.map((ask) => (
                        <OrderBookRow key={`ask-${ask.price}`} level={ask} type="ask" maxTotal={maxTotalCombined} />
                    ))}
                </div>

                <div className="py-1 text-center text-xs text-bloomberg-text-dim border-y border-bloomberg-border bg-bloomberg-panel/50">
                    {asks.length > 0 && bids.length > 0 ? (asks[0].price - bids[0].price).toFixed(2) : '-.--'}
                </div>

                {/* BIDS - Highest Price at Top */}
                <div className="flex flex-col">
                    {bids.map((bid) => (
                        <OrderBookRow key={`bid-${bid.price}`} level={bid} type="bid" maxTotal={maxTotalCombined} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrderBook;
