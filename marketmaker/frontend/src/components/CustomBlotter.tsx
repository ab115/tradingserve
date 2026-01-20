import React, { useMemo, useState } from 'react';
import { Position } from '../api';
import { DataGrid } from '@tradingserver/ui-core';
import { theme } from '@tradingserver/ui-core';

interface CustomBlotterProps {
    data: Position[];
}

const CustomBlotter: React.FC<CustomBlotterProps> = ({ data: rowData }) => {
    const [filterText, setFilterText] = useState('');

    const columns = [
        { key: 'ticker', label: 'SECURITY', width: 120 },
        {
            key: 'quantity',
            label: 'POS',
            align: 'right' as const,
            width: 100,
            render: (row: Position) => (
                <span style={{
                    color: row.quantity > 0 ? theme.colors.success : row.quantity < 0 ? theme.colors.danger : theme.colors.text.muted
                }}>
                    {row.quantity}
                </span>
            )
        },
        {
            key: 'current_price',
            label: 'PX',
            align: 'right' as const,
            width: 100,
            render: (row: Position) => row.current_price.toFixed(2)
        },
        {
            key: 'pnl',
            label: 'UPL',
            align: 'right' as const,
            width: 100,
            render: (row: Position) => (
                <span style={{
                    color: row.pnl > 0 ? theme.colors.success : row.pnl < 0 ? theme.colors.danger : theme.colors.text.muted
                }}>
                    {row.pnl.toFixed(2)}
                </span>
            )
        },
    ];

    const { usData, inData } = useMemo(() => {
        const us: Position[] = [];
        const ind: Position[] = [];
        const lowerFilter = filterText.toLowerCase();

        rowData.forEach(p => {
            if (filterText && !p.ticker.toLowerCase().includes(lowerFilter)) return;

            if (p.ticker.includes('.NS') || p.ticker.includes('.BO')) {
                ind.push(p);
            } else {
                us.push(p);
            }
        });
        return { usData: us, inData: ind };
    }, [rowData, filterText]);

    return (
        <div className="pro-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: 'none', backgroundColor: theme.colors.background }}>
            <div className="pro-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: theme.colors.surface }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: theme.colors.text.primary, fontWeight: 'bold' }}>GLOBAL BLOTTER</span>
                    <input
                        type="text"
                        placeholder="FILTER ALL"
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        style={{
                            background: theme.colors.background,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text.primary,
                            padding: '2px 5px',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            width: '120px'
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '4px', overflow: 'hidden', padding: '4px' }}>
                <div style={{ flex: 1, border: `1px solid ${theme.colors.border}` }}>
                    <DataGrid<Position> data={usData} columns={columns} />
                </div>
                <div style={{ flex: 1, border: `1px solid ${theme.colors.border}` }}>
                    <DataGrid<Position> data={inData} columns={columns} />
                </div>
            </div>
        </div>
    );
};

export default CustomBlotter;
