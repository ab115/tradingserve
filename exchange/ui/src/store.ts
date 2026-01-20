
import { create } from 'zustand';
import { Trade, OrderBookLevel } from './types';

// Helper to parse FIX dates
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

interface TickerState {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[]; // Sorted Low -> High
    trades: Trade[];
    lastPrice: number | null;
    previousPrice: number | null;
    totalVolume: number; // For ranking Top 5
}

interface ExchangeState {
    tickers: Record<string, TickerState>;

    // Actions
    processMessage: (msg: any) => void;
    initializeTicker: (symbol: string, snapshot: any) => void;
}

export const useExchangeStore = create<ExchangeState>((set) => ({
    tickers: {},

    initializeTicker: (symbol, snapshot) => {
        // Snapshot is now aggregated: { bids: [...], asks: [...], trades: [...], last_price: ... }

        const bids: OrderBookLevel[] = snapshot.bids || [];
        const asks: OrderBookLevel[] = snapshot.asks || [];

        // Ensure cumulative totals are calculated if backend doesn't send them?
        // Backend sends { price, qty, total=0 }.
        // We might want to calc total here for visualization bars.
        let bidTotal = 0;
        const processedBids = bids.map(b => {
            bidTotal += b.qty;
            return { ...b, total: bidTotal };
        });

        let askTotal = 0;
        const processedAsks = asks.map(a => {
            askTotal += a.qty;
            return { ...a, total: askTotal };
        });

        const snapshotTrades: Trade[] = [];
        if (snapshot.trades) {
            snapshot.trades.forEach((t: any) => {
                snapshotTrades.push({
                    id: t.id,
                    price: Number(t.price),
                    qty: Number(t.qty),
                    side: t.taker_side || 'Unknown',
                    timestamp: parseFixDate(t.timestamp),
                    symbol: t.symbol,
                    buyer: t.buyer,
                    seller: t.seller
                });
            });
            // Backend sends LATEST trades, usually in correct order or reverse?
            // Redis lrange(0, -1) returns [latest, ..., oldest] if we pushed with LPUSH, or [oldest, ..., latest] if RPUSH.
            // Producer uses RPUSH + LTRIM.
            // So Redis list is [oldest ... latest].
            // UI expects [latest ... oldest] usually for feed.
            snapshotTrades.reverse();
        }

        set(state => ({
            tickers: {
                ...state.tickers,
                [symbol]: {
                    bids: processedBids,
                    asks: processedAsks,
                    trades: snapshotTrades,
                    lastPrice: snapshot.last_price ? Number(snapshot.last_price) : null,
                    previousPrice: null,
                    totalVolume: snapshot.total_volume ? Number(snapshot.total_volume) : 0
                }
            }
        }));
    },

    processMessage: (msg: any) => {
        set(state => {
            const newTickers = { ...state.tickers };
            let hasChange = false;

            // Handle BOOK_SNAPSHOT / MARKET_DATA
            if (msg.type === 'MARKET_DATA' || msg.type === 'BOOK_SNAPSHOT') {
                const data = msg.data || msg; // msg might be the snapshot itself if direct payload
                // The consumer wraps it in { type: 'MARKET_DATA', data: snapshot }
                // The snapshot itself has type: 'BOOK_SNAPSHOT'

                const snapshot = data.type === 'BOOK_SNAPSHOT' ? data : data.data;
                // Wait, api.py structure: payload = { type: 'MARKET_DATA', data: parsed_data }
                // parsed_data from Redis is { type: 'BOOK_SNAPSHOT', bids: ... }
                // So msg.data is the snapshot.

                const symbol = snapshot.symbol;
                if (!symbol) return state;

                if (!newTickers[symbol]) {
                    newTickers[symbol] = { bids: [], asks: [], trades: [], lastPrice: null, previousPrice: null, totalVolume: 0 };
                }

                if (snapshot.bids && snapshot.asks) {
                    // Update Book
                    let bidTotal = 0;
                    const processedBids = (snapshot.bids as any[]).map(b => {
                        bidTotal += b.qty;
                        return { ...b, total: bidTotal };
                    });

                    let askTotal = 0;
                    const processedAsks = (snapshot.asks as any[]).map(a => {
                        askTotal += a.qty;
                        return { ...a, total: askTotal };
                    });

                    newTickers[symbol] = {
                        ...newTickers[symbol],
                        bids: processedBids,
                        asks: processedAsks
                    };
                    hasChange = true;
                }

                if (snapshot.last_price) {
                    newTickers[symbol] = {
                        ...newTickers[symbol],
                        lastPrice: Number(snapshot.last_price),
                        previousPrice: newTickers[symbol].lastPrice // Track previous
                    };
                    hasChange = true;
                }

            } else if (msg.type === 'EXECUTION_REPORT') {
                const report = msg.data;
                const symbol = report.Symbol;

                console.log("[Store] Exec Report Received:", {
                    symbol: symbol,
                    execId: report.ExecID,
                    type: report.ExecType
                });

                if (!symbol) return state;

                if (!newTickers[symbol]) {
                    newTickers[symbol] = { bids: [], asks: [], trades: [], lastPrice: null, previousPrice: null, totalVolume: 0 };
                }
                const tickerState = newTickers[symbol];
                const newTrades = [...tickerState.trades];

                // ExecType 'Fill' or 'PartialFill'
                if (report.ExecType === 'Fill' || report.ExecType === 'PartialFill') {
                    // Check if Taker to avoid duplicates (Maker report vs Taker report)
                    const isTaker = report.ExecID && report.ExecID.endsWith('_T');
                    console.log("[Store] IsTaker check:", isTaker, report.ExecID);

                    if (isTaker) {
                        const tradePrice = Number(report.AvgPx) || Number(report.Price) || 0;
                        let buyer = "Unknown";
                        let seller = "Unknown";
                        if (report.Side === 'Buy') {
                            buyer = report.TargetCompID || "Client";
                            seller = report.ContraParty || "Market";
                        } else if (report.Side === 'Sell') {
                            seller = report.TargetCompID || "Client";
                            buyer = report.ContraParty || "Market";
                        }

                        newTrades.unshift({
                            id: report.ExecID,
                            price: tradePrice,
                            qty: Number(report.LastQty),
                            side: report.Side || 'Unknown',
                            timestamp: parseFixDate(report.TransactTime),
                            symbol: symbol,
                            buyer,
                            seller
                        });

                        if (newTrades.length > 100) newTrades.pop();
                        // tradesChanged = true; // Variable doesn't exist. hasChange handled below.

                        // Also update last price here for faster feedback than snapshot?
                        const tradeQty = Number(report.LastQty) || 0;
                        newTickers[symbol] = {
                            ...newTickers[symbol],
                            lastPrice: tradePrice,
                            previousPrice: tickerState.lastPrice,
                            trades: newTrades,
                            totalVolume: (tickerState.totalVolume || 0) + tradeQty
                        };
                        hasChange = true;
                    }
                }
            }

            return hasChange ? { tickers: newTickers } : state;
        });
    }
}));
