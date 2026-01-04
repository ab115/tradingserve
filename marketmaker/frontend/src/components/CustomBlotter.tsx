import React, { useEffect, useState, useMemo } from 'react';
import { Position } from '../api';
import '../ProTerminal.css';

interface BlotterRowProps {
    data: Position;
}

const BlotterRow: React.FC<BlotterRowProps> = ({ data }) => {
    // Flash Logic
    const [flashClass, setFlashClass] = useState('');
    const prevQty = React.useRef(data.quantity);

    useEffect(() => {
        if (data.quantity > prevQty.current) {
            setFlashClass('pro-row-flash-green');
            setTimeout(() => setFlashClass(''), 1000);
        } else if (data.quantity < prevQty.current) {
            setFlashClass('pro-row-flash-red');
            setTimeout(() => setFlashClass(''), 1000);
        }
        prevQty.current = data.quantity;
    }, [data.quantity, data.lastUpdated]);

    return (
        <tr className={flashClass} style={{ borderBottom: '1px solid #222', height: '32px' }}>
            <td className="pro-cell-ticker" style={{ padding: '4px 8px' }}>{data.ticker}</td>
            <td className={data.quantity > 0 ? 'pro-cell-buy' : data.quantity < 0 ? 'pro-cell-sell' : 'pro-cell-dim'} style={{ padding: '4px 8px', textAlign: 'right' }}>
                {data.quantity}
            </td>
            <td style={{ padding: '4px 8px', textAlign: 'right' }}>{data.current_price.toFixed(2)}</td>
            <td className={data.pnl > 0 ? 'pro-cell-buy' : data.pnl < 0 ? 'pro-cell-sell' : 'pro-cell-dim'} style={{ padding: '4px 8px', textAlign: 'right' }}>
                {data.pnl.toFixed(2)}
            </td>
        </tr>
    );
};

type SortKey = 'lastUpdated' | 'ticker' | 'quantity' | 'pnl';
type SortDir = 'asc' | 'desc';

interface BlotterGridProps {
    title: string;
    data: Position[];
    filterText: string;
}

const BlotterGrid: React.FC<BlotterGridProps> = ({ title, data, filterText }) => {
    const [sortKey, setSortKey] = useState<SortKey>('lastUpdated');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'lastUpdated' ? 'desc' : 'asc');
        }
    };

    const sortedData = useMemo(() => {
        let filtered = data;
        if (filterText) {
            const lowerInfo = filterText.toLowerCase();
            filtered = data.filter(r => r.ticker.toLowerCase().includes(lowerInfo));
        }

        return [...filtered].sort((a, b) => {
            const valA = a[sortKey] ?? 0;
            const valB = b[sortKey] ?? 0;

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, filterText, sortKey, sortDir]);

    const Headers = [
        { key: 'ticker', label: 'SECURITY', align: 'left' },
        { key: 'quantity', label: 'POS', align: 'right' },
        { key: 'current_price', label: 'PX', align: 'right' },
        { key: 'pnl', label: 'UPL', align: 'right' },
    ];

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #333', overflow: 'hidden' }}>
            <div className="pro-panel-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#222' }}>
                <span style={{ fontWeight: 'bold', color: '#ccc' }}>{title}</span>
                <span style={{ fontSize: '10px', color: '#666' }}>{sortedData.length}</span>
            </div>
            <div className="pro-list-container">
                <table className="pro-table" style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            {Headers.map(h => (
                                <th
                                    key={h.key}
                                    onClick={() => handleSort(h.key as any)}
                                    style={{ textAlign: h.align as any, cursor: 'pointer', userSelect: 'none', padding: '4px' }}
                                >
                                    {h.label} {sortKey === h.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(row => (
                            <BlotterRow key={row.ticker} data={row} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface CustomBlotterProps {
    data: Position[];
}

const CustomBlotter: React.FC<CustomBlotterProps> = ({ data: rowData }) => {
    const [filterText, setFilterText] = useState('');

    // Pre-processing handled by Parent (ProTerminal) or we can assume rowData is fresh.
    // However, CustomBlotter relied on timestamping.
    // Let's assume parent stamps it or we stamp it here?
    // Parent should provide raw data. CustomBlotter can stamp it if needed for sorting? 
    // Actually, parent provides raw Position[]. The `lastUpdated` field is part of Position from API?
    // API `Position` interface: Check `api.ts`.
    // If we map it here:

    // We need to preserve the US/IN split logic.
    const { usData, inData } = useMemo(() => {
        const us: Position[] = [];
        const ind: Position[] = [];
        rowData.forEach(p => {
            // Ensure p has lastUpdated if not present?
            // Actually, parent will provide continuous updates.
            if (p.ticker.includes('.NS') || p.ticker.includes('.BO')) {
                ind.push(p);
            } else {
                us.push(p);
            }
        });
        return { usData: us, inData: ind };
    }, [rowData]);

    return (
        <div className="pro-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: 'none' }}>
            {/* Toolbar */}
            <div className="pro-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span>GLOBAL BLOTTER</span>
                    <input
                        type="text"
                        placeholder="FILTER ALL"
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        style={{
                            background: '#111', border: '1px solid #444',
                            color: '#fff', padding: '2px 5px', fontSize: '11px',
                            textTransform: 'uppercase', width: '120px'
                        }}
                    />
                </div>
            </div>

            {/* Side-by-Side Grids */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '4px', overflow: 'hidden', padding: '4px' }}>
                <BlotterGrid title="US EQUITIES" data={usData} filterText={filterText} />
                <BlotterGrid title="INDIA EQUITIES" data={inData} filterText={filterText} />
            </div>
        </div>
    );
};

export default CustomBlotter;
