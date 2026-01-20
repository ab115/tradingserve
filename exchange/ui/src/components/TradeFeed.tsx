import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { clsx } from "clsx";
import { Virtuoso } from 'react-virtuoso';

interface TradeFeedProps {
    trades: Trade[];
}

type SortKey = keyof Trade | 'time';

const TradeRow = React.memo(({ trade }: { trade: Trade }) => (
    <div className="flex border-b border-bloomberg-border/50 text-xs py-0.5 hover:bg-bloomberg-panel h-6 text-bloomberg-text font-mono items-center">
        <div className="w-1/4 px-2">{trade.timestamp.split('T')[1]?.split('.')[0] || trade.timestamp}</div>
        <div className={clsx("w-1/4 px-2 text-right", trade.side === 'Buy' ? 'text-green-500' : 'text-red-500')}>
            {trade.price.toFixed(2)}
        </div>
        <div className="w-1/4 px-2 text-right">{trade.qty}</div>
        <div className="w-1/8 px-2 text-right text-blue-300 hidden xl:block">{trade.buyer}</div>
        <div className="w-1/8 px-2 text-right text-red-300 hidden xl:block">{trade.seller}</div>
    </div>
));

const TradeFeed: React.FC<TradeFeedProps> = ({ trades }) => {
    const [sortKey, setSortKey] = useState<SortKey>('time');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sortedTrades = useMemo(() => {
        return [...trades].sort((a, b) => {
            let valA: any = a[sortKey as keyof Trade];
            let valB: any = b[sortKey as keyof Trade];
            if (sortKey === 'time') {
                valA = new Date(a.timestamp).getTime();
                valB = new Date(b.timestamp).getTime();
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [trades, sortKey, sortDir]);

    return (
        <div className="flex flex-col h-full bg-bloomberg-bg border border-bloomberg-border rounded-sm overflow-hidden text-sm">
            <div className="bg-bloomberg-panel px-2 py-1 border-b border-bloomberg-border font-bold text-bloomberg-orange flex justify-between shrink-0">
                <span>Time & Sales</span>
                <span className="text-xs text-gray-500 font-normal">
                    {trades.length} trades
                </span>
            </div>

            <div className="flex bg-bloomberg-bg border-b border-bloomberg-border text-xs text-bloomberg-text-dim py-1 font-semibold shrink-0 cursor-pointer select-none">
                <div className="w-1/4 px-2 hover:text-white" onClick={() => handleSort('time')}>Time {sortKey === 'time' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                <div className="w-1/4 px-2 text-right hover:text-white" onClick={() => handleSort('price')}>Px {sortKey === 'price' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                <div className="w-1/4 px-2 text-right hover:text-white" onClick={() => handleSort('qty')}>Qty {sortKey === 'qty' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                <div className="w-1/8 px-2 text-right hidden xl:block hover:text-white" onClick={() => handleSort('buyer')}>Buyer</div>
                <div className="w-1/8 px-2 text-right hidden xl:block hover:text-white" onClick={() => handleSort('seller')}>Seller</div>
            </div>

            <div className="flex-1 min-h-0">
                <Virtuoso
                    data={sortedTrades}
                    itemContent={(index: number, trade: Trade) => <TradeRow trade={trade} />}
                    style={{ height: '100%' }}
                />
            </div>
        </div>
    );
};

export default TradeFeed;
