import React, { useEffect, useState, useMemo } from 'react';
import OrderBook from './OrderBook';
import TradeFeed from './TradeFeed';
import PriceChart from './PriceChart';
import { OrderBookLevel, Trade } from '../types';
import { clsx } from 'clsx';
import { X, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MarketWidgetProps {
    symbol: string;
    lastWsMessage: any;
    onRemove: (symbol: string) => void;
}

const MarketWidget: React.FC<MarketWidgetProps> = ({ symbol, lastWsMessage, onRemove }) => {
    const [activeOrders, setActiveOrders] = useState<Record<string, any>>({});
    const [trades, setTrades] = useState<Trade[]>([]);
    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);

    // Price State
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    const [previousPrice, setPreviousPrice] = useState<number | null>(null);

    const priceDirection = useMemo(() => {
        if (!lastPrice || !previousPrice) return 'neutral';
        if (lastPrice > previousPrice) return 'up';
        if (lastPrice < previousPrice) return 'down';
        return 'neutral';
    }, [lastPrice, previousPrice]);

    // Helper to parse FIX dates (Same as App.tsx)
    const parseFixDate = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        const regex = /^(\d{4})(\d{2})(\d{2})-(\d{2}:\d{2}:\d{2})/;
        const match = dateStr.match(regex);
        if (match) {
            const [_, year, month, day, time] = match;
            const millis = dateStr.substring(match[0].length);
            return `${year}-${month}-${day}T${time}${millis}`;
        }
        return dateStr;
    };

    // Calculate Book from Active Orders
    useEffect(() => {
        const newBids: Record<number, number> = {};
        const newAsks: Record<number, number> = {};

        Object.values(activeOrders).forEach((order: any) => {
            const price = Number(order.price);
            const qty = Number(order.qty);
            if (!price || !qty) return;

            if (order.side === 'Buy') {
                newBids[price] = (newBids[price] || 0) + qty;
            } else if (order.side === 'Sell') {
                newAsks[price] = (newAsks[price] || 0) + qty;
            }
        });

        // Convert to Levels with Total
        const sortedBids = Object.entries(newBids)
            .map(([p, q]) => ({ price: Number(p), qty: q, total: q }))
            .sort((a, b) => b.price - a.price);

        // Cumulative Total Calculation
        let runningTotal = 0;
        const cumulativeBids = sortedBids.map(b => {
            runningTotal += b.qty;
            return { ...b, total: runningTotal };
        });

        const sortedAsks = Object.entries(newAsks)
            .map(([p, q]) => ({ price: Number(p), qty: q, total: q }))
            .sort((a, b) => a.price - b.price); // Low to High

        runningTotal = 0;
        const cumulativeAsks = sortedAsks.map(a => {
            runningTotal += a.qty;
            return { ...a, total: runningTotal };
        });

        setBids(cumulativeBids);
        setAsks(cumulativeAsks.reverse());

    }, [activeOrders]);

    // Handle WebSocket Messages
    useEffect(() => {
        if (lastWsMessage) {
            const msg = lastWsMessage;

            if (msg.type === 'NEW_ORDER') {
                const order = msg.data;
                if (order.symbol === symbol && order.type === '2') {
                    setActiveOrders(prev => ({
                        ...prev,
                        [order.id]: {
                            id: order.id,
                            side: order.side,
                            price: order.price,
                            qty: order.qty,
                            symbol: order.symbol
                        }
                    }));
                }
            } else if (msg.type === 'EXECUTION_REPORT') {
                const report = msg.data;
                if (report.Symbol === symbol) {
                    // Update Active Orders
                    setActiveOrders(prev => {
                        const orderId = report.OrderID;
                        const existing = prev[orderId];

                        if (report.OrdStatus === 'Filled' || report.OrdStatus === 'Canceled' || report.LeavesQty <= 0) {
                            if (existing) {
                                const next = { ...prev };
                                delete next[orderId];
                                return next;
                            }
                            return prev;
                        }
                        if (report.ExecType === 'PartialFill' || report.OrdStatus === 'PartiallyFilled') {
                            if (existing) {
                                return { ...prev, [orderId]: { ...existing, qty: report.LeavesQty } };
                            }
                        }
                        return prev;
                    });

                    // Update Trades and Price
                    if (report.ExecType === 'Fill' || report.ExecType === 'PartialFill') {
                        const tradePrice = Number(report.AvgPx) || Number(report.Price) || 0;

                        // Update Price if > 0
                        if (tradePrice > 0) {
                            setLastPrice(current => {
                                setPreviousPrice(current);
                                return tradePrice;
                            });
                        }

                        const isTaker = report.ExecID && report.ExecID.endsWith('_T');
                        if (isTaker) {
                            let buyer = "Unknown";
                            let seller = "Unknown";
                            if (report.Side === 'Buy') {
                                buyer = report.TargetCompID || "Client";
                                seller = report.ContraParty || "Market";
                            } else if (report.Side === 'Sell') {
                                seller = report.TargetCompID || "Client";
                                buyer = report.ContraParty || "Market";
                            }

                            const newTrade: Trade = {
                                id: report.ExecID,
                                price: tradePrice,
                                qty: Number(report.LastQty),
                                side: report.Side || 'Unknown',
                                timestamp: parseFixDate(report.TransactTime),
                                symbol: report.Symbol || 'Unknown',
                                buyer,
                                seller
                            };
                            setTrades(prev => [newTrade, ...prev].slice(0, 100)); // Increased buffer for chart
                        }
                    }
                }
            }
        }
    }, [lastWsMessage, symbol]);

    // Fetch Snapshot on Mount
    useEffect(() => {
        const fetchSnapshot = async () => {
            try {
                const response = await fetch(`http://localhost:8002/snapshot/${symbol}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.orders) {
                        const snapshotOrders: Record<string, any> = {};
                        data.orders.forEach((order: any) => {
                            snapshotOrders[order.id] = {
                                id: order.id,
                                side: order.side,
                                price: order.price,
                                qty: order.qty,
                                symbol: order.symbol
                            };
                        });
                        setActiveOrders(snapshotOrders);
                    }

                    if (data.trades) {
                        const snapshotTrades: Trade[] = data.trades.map((t: any) => ({
                            id: t.id,
                            price: Number(t.price),
                            qty: Number(t.qty),
                            side: t.taker_side || 'Unknown',
                            timestamp: parseFixDate(t.timestamp),
                            symbol: t.symbol,
                            buyer: t.buyer,
                            seller: t.seller
                        }));
                        setTrades(snapshotTrades.reverse());
                    }

                    if (data.last_price) {
                        setLastPrice(Number(data.last_price));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch snapshot:", err);
            }
        };
        fetchSnapshot();
    }, [symbol]);

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
                    <OrderBook bids={bids} asks={asks} symbol={symbol} />
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
