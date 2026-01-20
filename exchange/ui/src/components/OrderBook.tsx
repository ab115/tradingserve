import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { OrderBookLevel } from '../types';
import { Virtuoso } from 'react-virtuoso';

interface OrderBookProps {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    symbol: string;
}

// Optimized Row Component (Pure, no local state/timers)
// Flashing colors removed for performance as per optimization plan
const OrderBookRow = React.memo(({ level, type, maxTotal }: { level: OrderBookLevel; type: 'bid' | 'ask'; maxTotal: number }) => {
    // 5 Columns: BidEntity | BidQty | Price | AskQty | AskEntity
    // Widths: w-[20%] each? Or Price smaller?
    // Let's use flex-1 for equal width or specific percentages.
    // w-[22%] for Entity/Qty, w-[12%] for Price?
    const colWidth = "w-[22%]";
    const priceWidth = "w-[12%]";

    return (
        <div className="relative flex justify-between font-mono text-xs py-0.5 px-2 hover:bg-bloomberg-panel transition-colors duration-200 h-6">
            <div
                className={clsx("absolute top-0 bottom-0 opacity-10 transition-all duration-300", type === 'bid' ? "right-1/2 bg-green-500 origin-right" : "left-1/2 bg-red-500 origin-left")}
                style={{ width: `${(level.total / maxTotal) * 50}%` }}
            />
            {type === 'bid' ? (
                <>
                    <span className={clsx("z-10 truncate text-left text-bloomberg-text-dim text-[10px]", colWidth)} title={level.entity}>{level.entity || '-'}</span>
                    <span className={clsx("z-10 text-right text-bloomberg-text", colWidth)}>{level.qty}</span>
                    <span className={clsx("z-10 text-center text-green-500 font-bold", priceWidth)}>{level.price.toFixed(2)}</span>
                    <span className={clsx("z-10", colWidth)}></span>
                    <span className={clsx("z-10", colWidth)}></span>
                </>
            ) : (
                <>
                    <span className={clsx("z-10", colWidth)}></span>
                    <span className={clsx("z-10", colWidth)}></span>
                    <span className={clsx("z-10 text-center text-red-500 font-bold", priceWidth)}>{level.price.toFixed(2)}</span>
                    <span className={clsx("z-10 text-left text-bloomberg-text", colWidth)}>{level.qty}</span>
                    <span className={clsx("z-10 truncate text-right text-bloomberg-text-dim text-[10px]", colWidth)} title={level.entity}>{level.entity || '-'}</span>
                </>
            )}
        </div>
    );
});

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, symbol }) => {
    const maxTotalCombined = useMemo(() => Math.max(
        bids.length > 0 ? bids[bids.length - 1].total : 0,
        asks.length > 0 ? asks[asks.length - 1].total : 0
    ), [bids, asks]);

    return (
        <div className="flex flex-col h-full bg-bloomberg-bg border border-bloomberg-border rounded-sm overflow-hidden text-sm">
            <div className="bg-bloomberg-panel px-2 py-1 border-b border-bloomberg-border font-bold text-bloomberg-orange flex justify-between shrink-0">
                <span>{symbol}</span>
                <span className="text-xs text-bloomberg-text-dim">Order Book</span>
            </div>

            <div className="flex justify-between text-xs text-bloomberg-text-dim px-2 py-1 bg-bloomberg-bg border-b border-bloomberg-border shrink-0">
                <span className="w-[22%] text-left">Entity</span>
                <span className="w-[22%] text-right">Bid Qty</span>
                <span className="w-[12%] text-center">Px</span>
                <span className="w-[22%] text-left">Ask Qty</span>
                <span className="w-[22%] text-right">Entity</span>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {/* ASKS - Lowest Price at Bottom 
                   We want the list to appear "bottom justified" effectively.
                   Virtuoso renders top-down. 
                   If we pass 'asks' (which are Low to High price, usually rendered bottom-up in a UI where top is High Price),
                   we need to be careful.
                   Standard UI: Top = High Price. Bottom = Low Price.
                   So Asks should be sorted High to Low like Bids?
                   Wait, UI usually shows Spread in Middle.
                   Top Half: ASKS (High -> Low).
                   Bottom Half: BIDS (High -> Low).
                   
                   Current implementation in MarketWidget:
                   Asks sorted Low to High. 
                   Component rendered `flex-col-reverse` so First Item (Low Price) is at Bottom. Correct.
                   
                   With Virtuoso, we can't easily `flex-col-reverse`.
                   Better to SORT Asks High->Low and render normally?
                   If we sort High->Low, then the "Lowest Ask" (Best Price) is at the BOTTOM of the list.
                   So index N is Best Price.
                   Virtuoso renders index 0 at top (High Price).
                   So `asks` should be sorted High -> Low.
                   
                   Let's check MarketWidget again.
                   `setAsks(cumulativeAsks.reverse())`
                   cumulativeAsks was Low -> High.
                   So `asks` prop IS High -> Low (Highest Ask at index 0).
                   Original code: 
                   `<div className="flex flex-col-reverse"> {asks.map...} </div>`
                   Wait. `flex-col-reverse` renders [A, B, C] as:
                   C
                   B
                   A
                   
                   If `asks` passed in is [High, ..., Low], reverse makes it [Low, ..., High].
                   Lowest ask at top?? No, usually lowest ask is closest to spread (Bottom of Top component).
                   
                   Let's stick to standard top-down rendering for simplicity first.
                   We want:
                   Ask 105
                   Ask 104
                   Ask 103 (Best Ask)
                   ----- Spread -----
                   Bid 102 (Best Bid)
                   Bid 101
                   
                   So Asks should be sorted Descending (High -> Low).
                   Bids should be sorted Descending (High -> Low).
                   
                   If `asks` prop is High->Low, simply rendering them top-down works!
                */}

                <div className="flex-1 min-h-0 border-b border-bloomberg-border/30">
                    <Virtuoso
                        data={asks}
                        itemContent={(index, ask) => <OrderBookRow level={ask} type="ask" maxTotal={maxTotalCombined} />}
                        style={{ height: '100%' }}
                        followOutput={false}
                    />
                </div>

                <div className="py-1 text-center text-xs text-bloomberg-text-dim border-y border-bloomberg-border bg-bloomberg-panel/50 shrink-0">
                    {asks.length > 0 && bids.length > 0 && asks[asks.length - 1] && bids[0] ? (asks[asks.length - 1].price - bids[0].price).toFixed(2) : '-.--'}
                </div>

                {/* BIDS - Highest Price at Top 
                    Bids prop is High -> Low.
                    So Index 0 is Best Bid (High).
                    Render top-down:
                    Bid 102
                    Bid 101
                    Correct.
                */}
                <div className="flex-1 min-h-0">
                    <Virtuoso
                        data={bids}
                        itemContent={(index, bid) => <OrderBookRow level={bid} type="bid" maxTotal={maxTotalCombined} />}
                        style={{ height: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default OrderBook;
