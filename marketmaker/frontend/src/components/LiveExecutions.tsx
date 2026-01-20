import React from 'react';
import { useStore } from '../state';
import '../ProTerminal.css';

const LiveExecutions: React.FC = () => {
    const { executions } = useStore();

    return (
        <div className="pro-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="pro-panel-header" style={{ color: '#00ff00' }}>Live Executions</div>
            <div className="pro-list-container">
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Sym</th>
                            <th>Side</th>
                            <th>Qty</th>
                            <th>Px</th>
                        </tr>
                    </thead>
                    <tbody>
                        {executions.map((e, i) => (
                            <tr key={i} className="pro-row-flash">
                                <td className="pro-cell-dim">{new Date(e.timestamp * 1000).toLocaleTimeString([], { hour12: false })}</td>
                                <td className="pro-cell-ticker">{e.symbol}</td>
                                <td className={e.side === 'Buy' ? 'pro-cell-buy' : 'pro-cell-sell'}>{e.side}</td>
                                <td>{e.qty}</td>
                                <td>{Number(e.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LiveExecutions;
