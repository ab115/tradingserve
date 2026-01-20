import { useState, useEffect } from 'react';
import Blotter from './components/Blotter';
import ProTerminal from './components/ProTerminal';
import { getControlStatus, toggleQuoting } from './api';
import { useMarketData } from './hooks/useMarketData';
import './App.css';

function App() {
    const [quotingEnabled, setQuotingEnabled] = useState(true);
    const [isProMode, setIsProMode] = useState(false);

    // Initialize Global Market Data Connection
    useMarketData();

    useEffect(() => {
        getControlStatus().then(res => setQuotingEnabled(res.quoting_enabled));
    }, []);

    const handleToggle = async () => {
        const newState = !quotingEnabled;
        try {
            await toggleQuoting(newState);
            setQuotingEnabled(newState);
        } catch (e) {
            console.error("Failed to toggle quoting", e);
        }
    };

    if (isProMode) {
        return <ProTerminal onSwitchView={() => setIsProMode(false)} />;
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Market Maker Blotter</h1>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>

                    <button
                        onClick={() => setIsProMode(true)}
                        style={{
                            padding: '8px 16px',
                            background: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Switch to Pro Terminal 🚀
                    </button>

                    <button
                        onClick={handleToggle}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: quotingEnabled ? '#f44336' : '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {quotingEnabled ? 'STOP Quoting' : 'START Quoting'}
                    </button>

                    <div className="status-indicator">
                        <span className={`live-dot ${quotingEnabled ? '' : 'offline'}`}
                            style={{ backgroundColor: quotingEnabled ? '#4caf50' : '#888' }}>
                        </span>
                        {quotingEnabled ? 'Live' : 'Paused'}
                    </div>
                </div>
            </header>
            <main>
                <Blotter />
            </main>
        </div>
    )
}


export default App;
