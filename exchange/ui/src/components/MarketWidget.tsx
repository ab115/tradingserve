import React, { useEffect, useMemo } from 'react';
import OrderBook from './OrderBook';
import TradeFeed from './TradeFeed';
import PriceChart from './PriceChart';
import { clsx } from 'clsx';
import { X, ArrowUp, ArrowDown, Minus } from 'lucide-react';

import { useExchangeStore } from '../store';

interface MarketWidgetProps {
    symbol: string;
    onRemove: (symbol: string) => void;
}

const MarketWidget: React.FC<MarketWidgetProps> = ({ symbol, onRemove }) => {
    // Connect to Store
    const tickerState = useExchangeStore(state => state.tickers[symbol]);
    const initializeTicker = useExchangeStore(state => state.initializeTicker);

    // Derived or Default State if not yet initialized
    const trades = tickerState?.trades || [];
    const lastPrice = tickerState?.lastPrice || null;
    const previousPrice = tickerState?.previousPrice || null;

    const bids = tickerState?.bids || [];
    const asks = tickerState?.asks || [];

    // Reverse Asks for Display (High -> Low, so Lowest Ask is at bottom)
    const displayAsks = useMemo(() => [...asks].reverse(), [asks]);

    // Price Direction Calculation
    const priceDirection = useMemo(() => {
        if (!lastPrice || !previousPrice) return 'neutral';
        if (lastPrice > previousPrice) return 'up';
        if (lastPrice < previousPrice) return 'down';
        return 'neutral';
    }, [lastPrice, previousPrice]);

    // Fetch Snapshot on Mount -> Feed Store
    useEffect(() => {
        const fetchSnapshot = async () => {
            try {
                const response = await fetch(`http://localhost:8002/snapshot/${symbol}`);
                if (response.ok) {
                    const data = await response.json();
                    initializeTicker(symbol, data);
                }
            } catch (err) {
                console.error("Failed to fetch snapshot:", err);
            }
        };
        fetchSnapshot();
    }, [symbol, initializeTicker]);

    return (
        <div className="flex flex-col bg-bloomberg-bg border border-bloomberg-border rounded-sm overflow-hidden box-border shadow-lg relative market-widget"
            style={{ minWidth: '350px', minHeight: '300px', width: '400px', height: '600px', resize: 'both', overflow: 'hidden' }}>

            {/* Header / Draggable Area */}
            <div className="bg-bloomberg-panel/80 px-2 py-1 border-b border-bloomberg-border flex justify-between items-center select-none cursor-move">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-bloomberg-orange tracking-wider text-sm">{symbol}</span>
                    {lastPrice !== null && (
                        <div className={clsx("flex items-center gap-1 text-xs font-mono font-bold",
                            priceDirection === 'up' ? "text-green-500" :
                                priceDirection === 'down' ? "text-red-500" : "text-bloomberg-text-dim"
                        )}>
                            <span>{lastPrice.toFixed(2)}</span>
                            {priceDirection === 'up' && <ArrowUp size={12} />}
                            {priceDirection === 'down' && <ArrowDown size={12} />}
                            {priceDirection === 'neutral' && <Minus size={12} />}
                        </div>
                    )}
                </div>

                <button onClick={() => onRemove(symbol)} className="text-bloomberg-text-dim hover:text-red-500">
                    <X size={14} />
                </button>
            </div>

            {/* Content Container */}
            <div className="flex flex-col flex-1 overflow-hidden p-1 gap-1">
                {/* Order Book (Top - 40%) */}
                <div className="flex-grow h-[40%] overflow-hidden border-b border-bloomberg-border/30">
                    <OrderBook bids={bids} asks={displayAsks} symbol={symbol} />
                </div>

                {/* Trade Feed (Middle - 30%) */}
                <div className="flex-grow h-[30%] overflow-hidden border-b border-bloomberg-border/30">
                    <TradeFeed trades={trades} />
                </div>

                {/* Price Chart (Bottom - 30%) */}
                <div className="flex-grow h-[30%] overflow-hidden">
                    <PriceChart trades={trades} />
                </div>
            </div>
        </div>
    );
};

export default MarketWidget;
