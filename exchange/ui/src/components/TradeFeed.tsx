import React, { useState } from 'react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

import { Trade } from '../types';

interface TradeFeedProps {
    trades: Trade[];
}

type SortKey = keyof Trade | 'time'; // 'time' maps to timestamp

const TradeFeed: React.FC<TradeFeedProps> = ({ trades }) => {
    // Sorting State
    const [sortKey, setSortKey] = useState<SortKey>('time');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Keep only last 50 for performance, then sort
    // Note: We usually want to filter *then* sort, or sort all then slice?
    // "Time & Sales" is usually temporal. If we sort by Price, we break the "Time" aspect.
    // But user asked for sortable grid.

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc'); // Default to high-to-low for nums/time usually
        }
    };

    const sortedTrades = [...trades].sort((a, b) => {
        let valA: any = a[sortKey as keyof Trade];
        let valB: any = b[sortKey as keyof Trade];

        // Handle computed/special keys
        if (sortKey === 'time') {
            valA = new Date(a.timestamp).getTime();
            valB = new Date(b.timestamp).getTime();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const displayTrades = sortedTrades.slice(0, 50);

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span className="text-gray-600 ml-1">⇅</span>;
        return <span className="text-bloomberg-orange ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-bloomberg-bg border border-bloomberg-border rounded-sm overflow-hidden text-sm">
            <div className="bg-bloomberg-panel px-2 py-1 border-b border-bloomberg-border font-bold text-bloomberg-orange flex justify-between">
                <span>Time & Sales</span>
            </div>
            {/* Header */}
            <div className="flex text-xs text-bloomberg-text-dim px-2 py-1 bg-bloomberg-bg border-b border-bloomberg-border cursor-pointer select-none">
                <div onClick={() => handleSort('time')} className="w-1/5 hover:text-white flex items-center">
                    Time <SortIcon col="time" />
                </div>
                <div onClick={() => handleSort('price')} className="w-1/6 text-right hover:text-white flex items-center justify-end">
                    Px <SortIcon col="price" />
                </div>
                <div onClick={() => handleSort('qty')} className="w-1/6 text-right hover:text-white flex items-center justify-end">
                    Qty <SortIcon col="qty" />
                </div>
                <div onClick={() => handleSort('buyer')} className="w-1/5 text-right hover:text-white flex items-center justify-end">
                    Buyer <SortIcon col="buyer" />
                </div>
                <div onClick={() => handleSort('seller')} className="w-1/5 text-right hover:text-white flex items-center justify-end">
                    Seller <SortIcon col="seller" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-bloomberg-border">
                <AnimatePresence initial={false}>
                    {displayTrades.map((trade) => (
                        <motion.div
                            key={trade.id}
                            initial={{ backgroundColor: 'rgba(255, 165, 0, 0.5)' }} // Flash Orange
                            animate={{ backgroundColor: 'transparent' }}
                            transition={{ duration: 0.8 }}
                            className="flex text-xs font-mono py-0.5 px-2 border-b border-bloomberg-border/20 hover:bg-gray-800"
                        >
                            <span className="w-1/5 text-bloomberg-text-dim truncate">
                                {trade.timestamp.split('T')[1]?.split('.')[0] || trade.timestamp}
                            </span>
                            <span className={clsx("w-1/6 text-right", trade.side === 'Buy' ? "text-green-500" : "text-red-500")}>
                                {trade.price.toFixed(2)}
                            </span>
                            <span className="w-1/6 text-right text-bloomberg-text">{trade.qty}</span>
                            <span className="w-1/5 text-right text-blue-300 truncate pl-1" title={trade.buyer}>
                                {trade.buyer}
                            </span>
                            <span className="w-1/5 text-right text-red-300 truncate pl-1" title={trade.seller}>
                                {trade.seller}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TradeFeed;
