import React from 'react';
import { useStore } from '../state';
import '../ProTerminal.css';

const LiveOrders: React.FC = () => {
    const { orders } = useStore();

    return (
        <div className="pro-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="pro-panel-header">Live Orders</div>
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
                        {orders.map((o, i) => (
                            <tr key={i} className="pro-row-flash">
                                <td className="pro-cell-dim">{new Date(o.timestamp * 1000).toLocaleTimeString([], { hour12: false })}</td>
                                <td className="pro-cell-ticker">{o.symbol}</td>
                                <td className={o.side === 'Buy' ? 'pro-cell-buy' : 'pro-cell-sell'}>{o.side}</td>
                                <td>{o.qty}</td>
                                <td>{Number(o.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LiveOrders;
