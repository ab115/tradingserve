import { useEffect, useState } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket';
import MarketWidget from './components/MarketWidget';
import { clsx } from 'clsx';
import { Plus, RotateCcw } from 'lucide-react';

const WS_URL = 'ws://localhost:8002/ws';

function App() {
    // Global WebSocket
    const { lastJsonMessage, readyState } = useWebSocket(WS_URL, {
        share: false,
        shouldReconnect: () => true,
    });

    // Dashboard State
    // Default to having TSLA if clean state
    const [activeWidgets, setActiveWidgets] = useState<string[]>(['TSLA']);
    const [availableTickers, setAvailableTickers] = useState<Set<string>>(new Set(['TSLA']));
    const [selectedTickerToAdd, setSelectedTickerToAdd] = useState<string>('');

    // Fetch Available Tickers on Mount
    useEffect(() => {
        const fetchTickers = async () => {
            try {
                const res = await fetch('http://localhost:8002/tickers');
                if (res.ok) {
                    const list = await res.json();
                    if (Array.isArray(list) && list.length > 0) {
                        setAvailableTickers(prev => {
                            const next = new Set(prev);
                            list.forEach((t: string) => next.add(t));
                            return next;
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to fetch tickers:", e);
            }
        };
        fetchTickers();
    }, []);

    // Listen for new tickers via WS logic (Optional, if we want to auto-discover)
    useEffect(() => {
        if (lastJsonMessage) {
            const msg = lastJsonMessage as any;
            if (msg.type === 'NEW_ORDER' && msg.data?.symbol) {
                const sym = msg.data.symbol;
                setAvailableTickers(prev => prev.has(sym) ? prev : new Set(prev).add(sym));
            } else if (msg.type === 'MARKET_DATA') {
                // market data discovery
                const mdata = msg.data;
                const sym = mdata.symbol || mdata.Symbol || mdata.ticker;
                if (sym) setAvailableTickers(prev => prev.has(sym) ? prev : new Set(prev).add(sym));
            }
        }
    }, [lastJsonMessage]);

    const addWidget = () => {
        if (!selectedTickerToAdd) return;
        if (!activeWidgets.includes(selectedTickerToAdd)) {
            setActiveWidgets([...activeWidgets, selectedTickerToAdd]);
        }
        setSelectedTickerToAdd('');
    };

    const removeWidget = (symbol: string) => {
        setActiveWidgets(prev => prev.filter(w => w !== symbol));
    };

    const handleReset = async () => {
        if (confirm("Are you sure you want to RESET the Exchange? This will clear all orders and executions.")) {
            try {
                await fetch('http://localhost:8002/reset', { method: 'DELETE' });
                window.location.reload();
            } catch (e) {
                alert("Failed to reset: " + e);
            }
        }
    };

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    return (
        <div className="flex flex-col h-screen bg-bloomberg-bg text-bloomberg-text font-sans overflow-hidden">
            {/* Header */}
            <header className="h-10 bg-bloomberg-panel border-b border-bloomberg-border flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-bloomberg-orange text-lg tracking-wider">EXCHANGE DASHBOARD</span>

                    {/* Add Ticker Control */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                list="tickers-list"
                                value={selectedTickerToAdd}
                                onChange={(e) => setSelectedTickerToAdd(e.target.value.toUpperCase())}
                                className="bg-black border border-bloomberg-border text-bloomberg-orange font-bold px-2 py-0.5 w-32 focus:outline-none text-sm uppercase rounded"
                                placeholder="ADD TICKER"
                                onKeyDown={(e) => e.key === 'Enter' && addWidget()}
                            />
                            <datalist id="tickers-list">
                                {Array.from(availableTickers).map(t => (
                                    <option key={t} value={t} />
                                ))}
                            </datalist>
                        </div>
                        <button
                            onClick={addWidget}
                            className="bg-bloomberg-panel border border-bloomberg-border hover:bg-bloomberg-border/50 text-bloomberg-orange p-0.5 rounded"
                            title="Add Widget"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-bloomberg-border mx-2"></div>

                    <button
                        onClick={handleReset}
                        className="bg-red-900/30 border border-red-900/50 hover:bg-red-900/50 text-red-500 px-2 py-0.5 rounded text-xs flex items-center gap-1"
                        title="Reset Exchange (Clear All Data)"
                    >
                        <RotateCcw size={14} />
                        <span>RESET</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className={clsx("w-2 h-2 rounded-full", readyState === ReadyState.OPEN ? "bg-green-500" : "bg-red-500")}></span>
                    <span className="text-bloomberg-text-dim">{connectionStatus}</span>
                </div>
            </header>

            {/* Main Area - Flex Wrap Layout */}
            <main className="flex-1 overflow-auto p-4 flex flex-wrap gap-4 content-start">
                {activeWidgets.map(symbol => (
                    <MarketWidget
                        key={symbol}
                        symbol={symbol}
                        lastWsMessage={lastJsonMessage}
                        onRemove={removeWidget}
                    />
                ))}

                {activeWidgets.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-bloomberg-text-dim">
                        Add a ticker to view market data.
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
