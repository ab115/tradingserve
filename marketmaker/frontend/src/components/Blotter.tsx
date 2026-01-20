import React, { useState, useMemo } from 'react';
import { Position, addTicker, getPositions } from '../api';
import { useStore } from '../state';
import { DataGrid, theme } from '@tradingserver/ui-core';

const Blotter = () => {
    const { positions, setPositions } = useStore();
    const [newTicker, setNewTicker] = useState('');
    const [activeTab, setActiveTab] = useState<'US' | 'IN'>('US');

    // Helper to refresh data manually if needed (though Websocket updates store)
    const handleAddTicker = async () => {
        if (!newTicker) return;
        try {
            await addTicker(newTicker);
            setNewTicker('');
            // Optional: force fetch to be sure
            const updated = await getPositions();
            setPositions(updated);
        } catch (e) {
            alert("Failed to add ticker. Check console.");
            console.error(e);
        }
    };

    const filteredRowData = useMemo(() => {
        if (!positions) return [];
        return positions.filter(p => {
            const market = p.market ? p.market.trim().toUpperCase() : 'US';
            return market === activeTab;
        });
    }, [positions, activeTab]);

    const columns = [
        { key: 'ticker', label: 'Ticker' },
        {
            key: 'quantity',
            label: 'Quantity',
            align: 'right' as const,
            render: (row: Position) => (
                <span style={{
                    color: row.quantity > 0 ? theme.colors.success : row.quantity < 0 ? theme.colors.danger : theme.colors.text.muted
                }}>
                    {row.quantity}
                </span>
            )
        },
        { key: 'market', label: 'Market' },
        {
            key: 'avg_price',
            label: 'Avg Price',
            align: 'right' as const,
            render: (row: Position) => row.avg_price ? row.avg_price.toFixed(2) : '0.00'
        },
        {
            key: 'current_price',
            label: 'Current Price',
            align: 'right' as const,
            render: (row: Position) => <span style={{ fontWeight: 'bold' }}>{row.current_price ? row.current_price.toFixed(2) : '0.00'}</span>
        },
        {
            key: 'pnl',
            label: 'PnL',
            align: 'right' as const,
            render: (row: Position) => (
                <span style={{
                    color: row.pnl > 0 ? theme.colors.success : row.pnl < 0 ? theme.colors.danger : theme.colors.text.muted
                }}>
                    {row.pnl.toFixed(2)}
                </span>
            )
        }
    ];

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: '10px', color: theme.colors.text.primary }}>
            <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('US')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: activeTab === 'US' ? theme.colors.primary : theme.colors.surface,
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        US Market
                    </button>
                    <button
                        onClick={() => setActiveTab('IN')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: activeTab === 'IN' ? theme.colors.warning : theme.colors.surface,
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Indian Market
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={newTicker}
                        onChange={(e) => setNewTicker(e.target.value)}
                        placeholder="Enter Ticker (e.g., TSLA)"
                        style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.surface, color: 'white' }}
                    />
                    <button onClick={handleAddTicker} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: theme.colors.surface, color: theme.colors.text.primary, border: 'none' }}>Add Ticker</button>
                </div>
            </div>

            <div style={{ flex: 1, width: '100%', border: `1px solid ${theme.colors.border}` }}>
                {/* Use the shared DataGrid component */}
                <DataGrid<Position>
                    data={filteredRowData}
                    columns={columns}
                />
            </div>
        </div>
    );
};

export default Blotter;
