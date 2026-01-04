import React, { useState } from 'react';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { MarketDataWidget } from './components/Widgets/MarketDataWidget';
import { ChartWidget } from './components/Widgets/ChartWidget';
import { NewsWidget } from './components/Widgets/NewsWidget';
import { SectorWidget } from './components/Widgets/SectorWidget';
import './index.css';

function App() {
    const [selectedTicker, setSelectedTicker] = useState<string>("SPY");

    return (
        <div className="bloomberg-app">
            <header className="app-header">
                <div className="logo">BLOOMBERG <span className="terminal-text">TERMINAL</span></div>
                <div className="status-bar">Connection: <span className="status-ok">ESTABLISHED</span> | Selected: <span style={{ color: '#ff9800' }}>{selectedTicker}</span></div>
            </header>

            <DashboardLayout>
                <div key="market-us"><MarketDataWidget onSelect={setSelectedTicker} region="US" /></div>
                <div key="market-in"><MarketDataWidget onSelect={setSelectedTicker} region="IN" /></div>
                <div key="chart"><ChartWidget key={selectedTicker} symbol={selectedTicker} /></div>
                <div key="news"><NewsWidget ticker={selectedTicker} /></div>
                <div key="sector"><SectorWidget ticker={selectedTicker} /></div>
            </DashboardLayout>
        </div>
    );
}

export default App;
