import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { connectWebSocket, Position } from '../api';
import '../ProTerminal.css'; // Make sure styles are loaded

const ProBlotter: React.FC = () => {
    const [rowData, setRowData] = useState<Position[]>([]);

    // Column Definitions with Pro Styling
    const colDefs = useMemo<ColDef[]>(() => [
        {
            field: "ticker",
            headerName: "SECURITY",
            width: 120,
            cellClass: 'pro-cell-ticker'
        },
        {
            field: "lastUpdated",
            headerName: "TIME",
            hide: true,
            sortable: false // Managed manually
        },
        {
            field: "quantity",
            headerName: "POSITION",
            type: 'numericColumn',
            cellClass: params => params.value > 0 ? 'pro-cell-buy' : params.value < 0 ? 'pro-cell-sell' : 'pro-cell-dim',
            enableCellChangeFlash: true
        },
        {
            field: "current_price",
            headerName: "MARKET PX",
            valueFormatter: p => p.value.toFixed(2),
            type: 'numericColumn',
            enableCellChangeFlash: true
        },
        {
            field: "avg_price",
            headerName: "AVG PX",
            valueFormatter: p => p.value.toFixed(2),
            type: 'numericColumn',
            cellClass: 'pro-cell-dim'
        },
        {
            field: "pnl",
            headerName: "UPL (P&L)",
            width: 140,
            type: 'numericColumn',
            enableCellChangeFlash: true,
            cellClass: params => params.value > 0 ? 'pro-cell-buy' : params.value < 0 ? 'pro-cell-sell' : 'pro-cell-dim',
            valueFormatter: p => p.value.toFixed(2)
        }
    ], []);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
        suppressMovable: true,
    }), []);

    useEffect(() => {
        // Fetch Initial State
        // (Skipping REST fetch for speed, relying on WS snapshot to fill)

        // Connect WS
        const ws = connectWebSocket((data: any) => {
            if (!Array.isArray(data)) return;

            setRowData(prevData => {
                const rMap = new Map(prevData.map(p => [p.ticker, p]));
                data.forEach((p: Position) => {
                    // Inject timestamp for sorting if backend doesn't provide
                    if (!p.lastUpdated) p.lastUpdated = Date.now();
                    rMap.set(p.ticker, p);
                });
                return Array.from(rMap.values()).sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
            });
        });

        return () => ws.close();
    }, []);

    const onGridReady = (params: GridReadyEvent) => {
        params.api.sizeColumnsToFit();
    };

    return (
        <div className="pro-blotter-container">
            <AgGridReact
                className="ag-theme-alpine-dark"
                rowData={rowData}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                getRowId={(params) => params.data.ticker}
                onGridReady={onGridReady}
                animateRows={true}
                enableCellChangeFlash={true}
            />
        </div>
    );
};

export default ProBlotter;
