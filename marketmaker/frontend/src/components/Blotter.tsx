import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the grid
import { ColDef } from 'ag-grid-community';
import { Position, connectWebSocket, getPositions } from '../api';
import { FlashCell } from './FlashCell';

const Blotter = () => {
    const [rowData, setRowData] = useState<Position[]>([]);

    const [colDefs] = useState<ColDef<Position>[]>([
        { field: "ticker", filter: true, sortable: true },
        {
            field: "lastUpdated",
            sort: 'desc',
            hide: true, // Hidden column for sorting
            sortable: true
        },
        {

            field: "quantity",
            filter: true,
            sortable: true,
            cellRenderer: FlashCell
        },
        { field: "market", filter: true, sortable: true },
        {
            field: "avg_price",
            valueFormatter: p => p.value ? p.value.toFixed(2) : '0.00',
            sortable: true,
            cellRenderer: FlashCell
        },
        {
            field: "current_price",
            valueFormatter: p => p.value ? p.value.toFixed(2) : '0.00',
            sortable: true,
            cellStyle: { fontWeight: 'bold' },
            cellRenderer: FlashCell
        },
        {
            field: "pnl",
            valueFormatter: p => p.value.toFixed(2),
            sortable: true,
            cellRenderer: FlashCell,
            cellStyle: params => {
                if (params.value > 0) return { color: '#4caf50' };
                if (params.value < 0) return { color: '#f44336' };
                return null;
            }
        }
    ]);

    const defaultColDef = useMemo(() => ({
        flex: 1,
    }), []);

    useEffect(() => {
        // Initial fetch
        getPositions().then(data => setRowData(data));

        // Connect to WebSocket for real-time updates
        const ws = connectWebSocket((data: any) => {
            // CRITICAL FIX: The WS now sends "STATUS_UPDATE" objects too.
            // We must only process Arrays as Position updates.
            if (!Array.isArray(data)) {
                console.log("[WS] Received non-array message (Status Update?):", data);
                return;
            }

            console.log(`[WS] Received ${data.length} updates`); // Debug log

            setRowData(prevData => {
                // Create a map of existing data for fast lookup
                const rMap = new Map(prevData.map(p => [p.ticker, p]));

                // Merge new data
                const now = Date.now();
                data.forEach((p: Position) => {
                    p.lastUpdated = now; // Mark update time
                    rMap.set(p.ticker, p);
                });

                return Array.from(rMap.values());
            });
        });

        return () => ws.close();
    }, []);

    const [newTicker, setNewTicker] = useState('');

    const handleAddTicker = async () => {
        if (!newTicker) return;
        try {
            const api = await import('../api');
            await api.addTicker(newTicker);
            setNewTicker('');
            // Force immediate refresh from API as fallback/confirmation
            const updatedData = await api.getPositions();
            setRowData(updatedData);
        } catch (e) {
            alert("Failed to add ticker. Check console for details.");
            console.error(e);
        }
    };

    const [activeTab, setActiveTab] = useState<'US' | 'IN'>('US');

    const filteredRowData = useMemo(() => {
        if (!rowData) return [];
        return rowData.filter(p => {
            // Robust check: handle nulls, whitespace
            const market = p.market ? p.market.trim().toUpperCase() : 'US';
            return market === activeTab;
        });
    }, [rowData, activeTab]);

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('US')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: activeTab === 'US' ? '#2196f3' : '#333',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        US Market
                    </button>
                    <button
                        onClick={() => setActiveTab('IN')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: activeTab === 'IN' ? '#ff9800' : '#333',
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
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: 'white' }}
                    />
                    <button onClick={handleAddTicker} style={{ padding: '8px 16px', cursor: 'pointer' }}>Add Ticker</button>
                </div>
            </div>

            <div
                className="ag-theme-quartz-dark" // applying the grid theme
                style={{ flex: 1, width: '100%' }} // the grid will fill the size of the parent container
            >
                <AgGridReact
                    rowData={filteredRowData}
                    columnDefs={colDefs}
                    defaultColDef={defaultColDef}
                    getRowId={(params) => params.data.ticker}
                    enableCellChangeFlash={true}
                />
            </div>
        </div>
    );
};

export default Blotter;
