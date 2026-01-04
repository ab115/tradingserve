import React, { useState, useEffect, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { ArrowUp, ArrowDown, Search } from 'lucide-react';

import { getWsUrl } from '../../config';

interface MarketUpdate {
    ticker: string;
    price: number;
    timestamp: string;
}

interface TickerState {
    ticker: string;
    price: number;
    prevPrice: number;
    change: number;
    percentChange: number;
    lastUpdate: number; // timestamp ms
    flash: 'up' | 'down' | null;
}

interface Props {
    onSelect: (ticker: string) => void;
    region?: 'US' | 'IN' | 'ALL';
}

export const MarketDataWidget: React.FC<Props> = ({ onSelect, region = 'ALL' }) => {
    const [tickers, setTickers] = useState<Record<string, TickerState>>({});
    const [filterText, setFilterText] = useState("");
    const socketUrl = getWsUrl('ws/marketdata');

    // Ref to track timeouts for clearing flash
    const flashTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const { lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectInterval: 3000,
    });

    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const update = JSON.parse(lastMessage.data) as MarketUpdate;
                setTickers(prev => {
                    const current = prev[update.ticker];
                    const prevPrice = current ? current.price : update.price;
                    const change = update.price - prevPrice;
                    const percentChange = (change / prevPrice) * 100;
                    const now = Date.now();

                    let flash: 'up' | 'down' | null = null;
                    if (change > 0) flash = 'up';
                    if (change < 0) flash = 'down';

                    // Clear existing timeout if any
                    if (flashTimeouts.current[update.ticker]) {
                        clearTimeout(flashTimeouts.current[update.ticker]);
                    }

                    // This is a bit tricky in React state, usually we set a timeout to remove the class.
                    // But for high freq, just setting the property is enough if we render it.
                    // We'll trust the re-render cycle. To clear it, we'd need another effect or a settimeout here that triggers state.
                    // For now, let's keep it simple: The 'flash' state persists until the next update or we can clear it.
                    // Actually, "pop to top" means we sort by lastUpdate.

                    return {
                        ...prev,
                        [update.ticker]: {
                            ticker: update.ticker,
                            price: update.price,
                            prevPrice,
                            change,
                            percentChange,
                            lastUpdate: now,
                            flash
                        }
                    };
                });

                // Auto-clear flash after 500ms? 
                // Doing this inside the render/effect loop might be too heavy. 
                // Let's rely on CSS animation keyframes for the "flash" effect instead of state toggle.
                // We just need to trigger a re-render. Pop-to-top happens via sorting.

            } catch (e) {
                console.error("Parse error", e);
            }
        }
    }, [lastMessage]);

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    // Logic to process list:
    // 1. Convert to array
    // 2. Filter
    // 3. Split (US/IN)
    // 4. Sort (Pop to top = sort by lastUpdate desc)

    const allTickers = Object.values(tickers);
    const filtered = allTickers.filter(t => t.ticker.toLowerCase().includes(filterText.toLowerCase()));

    // Sort by lastUpdate Descending (Pop to top)
    filtered.sort((a, b) => b.lastUpdate - a.lastUpdate);

    // Apply Region Filter
    const regionTickers = filtered.filter(t => {
        if (region === 'US') return !t.ticker.endsWith('.NS');
        if (region === 'IN') return t.ticker.endsWith('.NS');
        return true;
    });

    const renderGrid = (items: TickerState[]) => (
        <div className="market-section" style={{ border: 'none' }}>
            <div className="ticker-grid-header">
                <span>Ticker</span>
                <span>Price</span>
                <span>Chg</span>
                <span>%</span>
            </div>
            <div className="ticker-list">
                {items.map(data => (
                    <div
                        key={data.ticker}
                        className={`ticker-row ${data.flash ? 'flash-' + data.flash : ''}`}
                        onClick={() => onSelect(data.ticker)}
                    >
                        <span className="sym">{data.ticker.replace('.NS', '')}</span>
                        <span className="price">{data.price.toFixed(2)}</span>
                        <span className={`chg ${data.change >= 0 ? 'up' : 'down'}`}>
                            {data.change.toFixed(2)}
                        </span>
                        <span className={`pchg ${data.change >= 0 ? 'up' : 'down'}`}>
                            {data.change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            {Math.abs(data.percentChange).toFixed(2)}%
                        </span>
                    </div>
                ))}
                {items.length === 0 && <div style={{ padding: 10, color: '#666', textAlign: 'center', fontStyle: 'italic' }}>Waiting for data...</div>}
            </div>
        </div>
    );

    return (
        <div className="widget market-widget">
            <div className="widget-header">
                <h3>{region === 'US' ? 'US Market' : region === 'IN' ? 'Indian Market' : 'Market Data'} <span style={{ fontSize: '10px', color: readyState === ReadyState.OPEN ? '#00e676' : 'red' }}>{connectionStatus}</span></h3>
                <div className="search-box">
                    <Search size={14} color="#666" />
                    <input
                        type="text"
                        placeholder="Filter..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
            </div>

            <div className="single-view" style={{ height: 'calc(100% - 40px)', display: 'flex', flexDirection: 'column' }}>
                {renderGrid(regionTickers)}
            </div>

            <style>{`
        .widget-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #333; }
        .search-box { display: flex; align-items: center; background: #222; padding: 2px 6px; border-radius: 4px; }
        .search-box input { background: transparent; border: none; color: #fff; font-size: 12px; margin-left: 4px; outline: none; width: 80px; }
        
        .market-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        
        .ticker-grid-header { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; padding: 4px 8px; background: #1a1a1a; font-weight: bold; font-size: 10px; color: #666; }
        .ticker-list { overflow-y: auto; flex: 1; }
        
        .ticker-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; padding: 4px 8px; border-bottom: 1px solid #2a2a2a; font-size: 12px; font-family: 'Roboto Mono', monospace; transition: background 0.3s; }
        .ticker-row:hover { background: #333; cursor: pointer; }
        
        .sym { color: #ff9800; font-weight: bold; }
        .up { color: #00e676; }
        .down { color: #ff5252; }
        
        @keyframes flashGreen { 0% { background-color: rgba(0, 230, 118, 0.3); } 100% { background-color: transparent; } }
        @keyframes flashRed { 0% { background-color: rgba(255, 82, 82, 0.3); } 100% { background-color: transparent; } }
        
        .flash-up { animation: flashGreen 1s ease-out; }
        .flash-down { animation: flashRed 1s ease-out; }
        `}</style>
        </div>
    );
};


