import React, { useState, useEffect } from 'react';
import CustomBlotter from './CustomBlotter';
import LiveOrders from './LiveOrders';
import LiveExecutions from './LiveExecutions';
import { updateStrategyParams, switchStrategy, triggerSweep, toggleQuoting, getControlStatus, Position, addTicker } from '../api';
import { useStore } from '../state';
import '../ProTerminal.css';

interface ProTerminalProps {
    onSwitchView: () => void;
}

const ProTerminal: React.FC<ProTerminalProps> = ({ onSwitchView }) => {
    // Strategy State
    const [gamma, setGamma] = useState(0.1);
    const [sigma, setSigma] = useState(0.5);
    const [strategyType, setStrategyType] = useState("AvellanedaStoikov");
    const [quoting, setQuoting] = useState(true);

    // UI State
    const [statusMsg, setStatusMsg] = useState("System Ready");

    // Data State
    const { positions } = useStore();

    useEffect(() => {
        getControlStatus().then(res => setQuoting(res.quoting_enabled));
    }, []);

    const handleParamChange = async (newGamma: number, newSigma: number) => {
        setGamma(newGamma);
        setSigma(newSigma);
        try {
            await updateStrategyParams({ gamma: newGamma, sigma: newSigma });
            setStatusMsg(`Params Updated: γ=${newGamma}, σ=${newSigma}`);
        } catch (e) {
            setStatusMsg("Error Updating Params");
        }
    };

    const handleStrategySwitch = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVal = e.target.value;
        setStrategyType(newVal);
        try {
            await switchStrategy(newVal);
            setStatusMsg(`Strategy Switched to ${newVal}`);
        } catch (e) {
            setStatusMsg("Error Switching Strategy");
        }
    };

    const handleSweep = async () => {
        if (!confirm("Are you sure you want to Market Sweep all open orders?")) return;
        try {
            setStatusMsg("Sweeping Open Orders...");
            await triggerSweep();
            setStatusMsg("Sweep Complete. Orders Filled.");
        } catch (e) {
            setStatusMsg("Sweep Failed");
        }
    };

    const [newTicker, setNewTicker] = useState("");

    const submitTicker = async () => {
        if (!newTicker.trim()) return;
        const val = newTicker.trim().toUpperCase();
        try {
            setStatusMsg(`Adding ${val}...`);
            await addTicker(val);
            setNewTicker("");
            setStatusMsg(`${val} Added.`);
        } catch (err) {
            setStatusMsg(`Error adding ${val}`);
        }
    };

    const handleToggleQuoting = async () => {
        const newState = !quoting;
        try {
            await toggleQuoting(newState);
            setQuoting(newState);
            setStatusMsg(newState ? "Quoting Resumed" : "Quoting Paused");
        } catch (e) { console.error(e) }
    };

    return (
        <div className="pro-terminal">
            {/* Top Header */}
            <header className="pro-header">
                <div className="pro-brand">Antigravity<span style={{ color: '#fff' }}>Terminal</span></div>

                <div className="pro-controls">
                    <div className="pro-stat">Status: <span>{statusMsg}</span></div>
                    <div style={{ width: '1px', height: '20px', background: '#333' }}></div>

                    <button className="pro-btn" onClick={onSwitchView}>
                        Switch to Classic
                    </button>

                    <button
                        className={`pro-btn ${quoting ? 'danger' : 'primary'}`}
                        onClick={handleToggleQuoting}
                    >
                        {quoting ? 'STOP QUOTING' : 'START QUOTING'}
                    </button>
                </div>
            </header>

            {/* Main Grid Layout */}
            <div className="pro-grid">
                {/* Left Sidebar: Strategy & Market */}
                <aside className="pro-sidebar">
                    <div className="pro-panel-header">Strategy Controls</div>
                    <div className="strategy-controls">

                        <div className="control-group">
                            <label>Strategy Type</label>
                            <select
                                value={strategyType}
                                onChange={handleStrategySwitch}
                                style={{ background: '#333', color: '#fff', border: 'none', padding: '4px' }}
                            >
                                <option value="AvellanedaStoikov">Avellaneda-Stoikov</option>
                                <option value="ConstantSpread">Constant Spread</option>
                            </select>
                        </div>

                        <div className="control-group">
                            <label>Risk Aversion (Gamma) <span>{gamma}</span></label>
                            <input
                                type="range"
                                min="0.01" max="1.0" step="0.01"
                                value={gamma}
                                className="slider"
                                onChange={(e) => handleParamChange(parseFloat(e.target.value), sigma)}
                            />
                        </div>

                        <div className="control-group">
                            <label>Volatility (Sigma) <span>{sigma}</span></label>
                            <input
                                type="range"
                                min="0.1" max="5.0" step="0.1"
                                value={sigma}
                                className="slider"
                                onChange={(e) => handleParamChange(gamma, parseFloat(e.target.value))}
                            />
                        </div>

                        <hr style={{ borderColor: '#333', width: '100%' }} />

                        <div className="control-group">
                            <label>Tools</label>
                            <button className="pro-btn danger" onClick={handleSweep}>
                                ⚠️ SWEEP & FILL OPEN ORDERS
                            </button>
                        </div>

                    </div>

                    <div className="pro-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Active Quotes</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <input
                                type="text"
                                placeholder="TICKER"
                                value={newTicker}
                                onChange={(e) => setNewTicker(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitTicker()}
                                style={{
                                    background: '#111', border: '1px solid #444',
                                    color: '#fff', padding: '2px 5px', fontSize: '10px',
                                    textTransform: 'uppercase', width: '60px'
                                }}
                            />
                            <button
                                onClick={submitTicker}
                                style={{
                                    background: '#222', border: '1px solid #444', color: '#0f0',
                                    fontSize: '10px', cursor: 'pointer', padding: '0 4px'
                                }}
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div className="ticker-list">
                        {positions.filter(p => p.algo_active).length === 0 && <div style={{ padding: '10px', color: '#666' }}>No active quotes...</div>}
                        {positions.filter(p => p.algo_active).map(p => (
                            <div key={p.ticker} className="ticker-item">
                                <span className="ticker-symbol">{p.ticker}</span>
                                <span className={`ticker-price ${p.pnl > 0 ? 'pro-text-green' : p.pnl < 0 ? 'pro-text-red' : ''}`}>
                                    {p.current_price.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content: Blotter */}
                <main className="pro-main">
                    <div className="pro-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Trade Blotter</span>
                        <span style={{ fontSize: '0.8em', color: '#666' }}>Real-time • 1ms Latency</span>
                    </div>
                    {/* Reuse existing Blotter component but it expands to fill flex parent */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <CustomBlotter data={positions} />
                    </div>
                </main>

                {/* Right Sidebar: Live Feed */}
                <aside className="pro-sidebar" style={{ gap: '4px', background: 'var(--pro-bg)', border: 'none' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <LiveOrders />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <LiveExecutions />
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ProTerminal;
