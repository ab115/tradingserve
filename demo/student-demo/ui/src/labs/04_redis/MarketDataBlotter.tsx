import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface TickerData {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    volume?: number;
    timestamp?: string;
}

export default function MarketDataBlotter() {
    const [tickers, setTickers] = useState<Record<string, TickerData>>({});
    const [lastUpdate, setLastUpdate] = useState<Record<string, 'up' | 'down' | null>>({});

    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/redis`);

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'market_data' || data.symbol || data.ticker) {
                    // Normalize data structure if needed
                    const symbol = data.symbol || data.ticker;
                    const price = parseFloat(data.price || data.last || 0);

                    if (!symbol || !price) return;

                    setTickers(prev => {
                        const prevPrice = prev[symbol]?.price || 0;

                        // Side effect for visual flash - strictly speaking this should be in a separate effect dependent on tickers,
                        // but for high-freq updates, calculating it here avoids an extra render cycle.
                        // However, update state separate from data state.

                        if (price !== prevPrice) {
                            const direction = price > prevPrice ? 'up' : 'down';

                            // Trigger the flash
                            setLastUpdate(u => ({ ...u, [symbol]: direction }));

                            // Clear the flash
                            setTimeout(() => {
                                setLastUpdate(u => ({ ...u, [symbol]: null }));
                            }, 800);
                        }

                        return {
                            ...prev,
                            [symbol]: {
                                symbol,
                                price,
                                bid: parseFloat(data.bid || price - 0.05),
                                ask: parseFloat(data.ask || price + 0.05),
                                volume: data.volume || prev[symbol]?.volume || 0
                            }
                        };
                    });
                }
            } catch (err) {
                // Ignore parsing errors for non-JSON stream data
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#0a0f1c] text-xs font-mono overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 font-bold tracking-wider shrink-0">
                <span className="flex items-center gap-2"><Activity size={14} className="text-blue-400" /> QUOTES</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 hidden sm:inline-block">LIVE</span>
            </div>

            {/* Grid Header - Responsive */}
            <div className="grid grid-cols-3 sm:grid-cols-4 px-3 py-1.5 bg-slate-800/50 text-slate-500 border-b border-slate-800 font-bold uppercase text-[10px] shrink-0">
                <div>Symbol</div>
                <div className="text-right">Last</div>
                <div className="text-right hidden sm:block">Bid / Ask</div>
                <div className="text-right">Chg</div>
            </div>

            {/* Ticker List - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {Object.values(tickers).length === 0 && (
                    <div className="p-4 text-center text-slate-600 italic">Waiting...</div>
                )}

                {Object.values(tickers).map((t) => {
                    const flash = lastUpdate[t.symbol];
                    const colorClass = flash === 'up' ? 'bg-green-500/20 text-green-300 transition-colors duration-300' :
                        flash === 'down' ? 'bg-red-500/20 text-red-300 transition-colors duration-300' :
                            'text-slate-300 transition-colors duration-500';

                    return (
                        <div key={t.symbol} className={`grid grid-cols-3 sm:grid-cols-4 px-3 py-2 border-b border-slate-800/50 hover:bg-white/5 items-center ${colorClass}`}>
                            <div className="font-bold text-white truncate">{t.symbol}</div>
                            <div className="text-right font-mono">{t.price.toFixed(2)}</div>
                            <div className="text-right text-slate-500 text-[10px] hidden sm:block">
                                {t.bid.toFixed(2)} / {t.ask.toFixed(2)}
                            </div>
                            <div className="text-right flex justify-end">
                                {flash === 'up' ? <TrendingUp size={14} className="text-green-500" /> :
                                    flash === 'down' ? <TrendingDown size={14} className="text-red-500" /> :
                                        <span className="text-slate-600">-</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
