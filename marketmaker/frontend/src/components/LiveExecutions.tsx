import React, { useEffect, useState } from 'react';
import { connectWebSocket } from '../api';
import '../ProTerminal.css';

interface LiveExec {
    symbol: string;
    side: string;
    qty: number;
    price: number;
    status: string; // 1=Partial, 2=Filled
    timestamp: number;
}

const LiveExecutions: React.FC = () => {
    const [execs, setExecs] = useState<LiveExec[]>([]);

    useEffect(() => {
        const ws = connectWebSocket((msg: any) => {
            if (msg.type === 'EVENT' && msg.subtype === 'EXEC_REPORT') {
                const data = msg.data as LiveExec;
                // Only show fills
                if (data.status === '1' || data.status === '2') {
                    setExecs(prev => [data, ...prev].slice(0, 20));
                }
            }
        });
        return () => ws.close();
    }, []);

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
                        {execs.map((e, i) => (
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
