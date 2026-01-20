import { useEffect, useState, useCallback } from 'react'
import { useExchangeStore } from './store';
import MarketWidget from './components/MarketWidget';
import { clsx } from 'clsx';
import { Plus, RotateCcw } from 'lucide-react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const WS_URL = (() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/exchange/ws`;
})();

function App() {
    const processMessage = useExchangeStore(state => state.processMessage);

    // Local State
    const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
    const [availableTickers, setAvailableTickers] = useState<Set<string>>(new Set());
    const [selectedTickerToAdd, setSelectedTickerToAdd] = useState("");

    // WebSocket
    const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
        shouldReconnect: (closeEvent) => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
    });

    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const data = JSON.parse(lastMessage.data);
                processMessage(data);
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        }
    }, [lastMessage, processMessage]);

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'CONNECTING',
        [ReadyState.OPEN]: 'CONNECTED',
        [ReadyState.CLOSING]: 'CLOSING',
        [ReadyState.CLOSED]: 'DISCONNECTED',
        [ReadyState.UNINSTANTIATED]: 'UNINSTANTIATED',
    }[readyState];

    // REST API - Fetch Tickers
    const fetchTickers = useCallback(async () => {
        try {
            // Use relative path via Nginx
            const res = await fetch('/exchange/api/tickers');
            if (res.ok) {
                const data = await res.json();
                // Assuming data is array of { symbol: "AAPL" } or just strings
                const symbols = data.map((t: any) => t.symbol || t);
                setAvailableTickers(new Set(symbols));

                // If no widgets, defaulting to first 4
                if (activeWidgets.length === 0 && symbols.length > 0) {
                    setActiveWidgets(symbols.slice(0, 4));
                }
            }
        } catch (e) {
            console.error("Failed to fetch tickers", e);
        }
    }, [activeWidgets.length]);

    useEffect(() => {
        fetchTickers();
    }, [fetchTickers]);

    // Widget Management
    const addWidget = () => {
        if (selectedTickerToAdd && !activeWidgets.includes(selectedTickerToAdd)) {
            setActiveWidgets([...activeWidgets, selectedTickerToAdd]);
            setSelectedTickerToAdd("");
        }
    };

    const removeWidget = (symbol: string) => {
        setActiveWidgets(activeWidgets.filter(s => s !== symbol));
    };

    const handleReset = async () => {
        if (confirm("Are you sure you want to RESET the Exchange? This will clear all orders and executions.")) {
            try {
                await fetch('/exchange/api/reset', { method: 'DELETE' });
                window.location.reload();
            } catch (e) {
                alert("Failed to reset: " + e);
            }
        }
    };

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
                    <span className={clsx("w-2 h-2 rounded-full", connectionStatus === 'CONNECTED' ? "bg-green-500" : "bg-red-500")}></span>
                    <span className="text-bloomberg-text-dim">{connectionStatus}</span>
                </div>
            </header>

            {/* Main Area - Flex Wrap Layout */}
            <main className="flex-1 overflow-auto p-4 flex flex-wrap gap-4 content-start">
                {activeWidgets.map(symbol => (
                    <MarketWidget
                        key={symbol}
                        symbol={symbol}
                        onRemove={removeWidget}
                    />
                ))}

                {activeWidgets.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-bloomberg-text-dim">
                        Add a ticker using the input above to view market data.
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
