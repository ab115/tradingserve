import { useEffect, useState, useMemo, useRef, UIEvent } from 'react';
import { Filter, ArrowUp, ArrowDown, Search, Activity, DollarSign, Briefcase } from 'lucide-react';

// Lab 6: The Glass (Advanced React Blotter)
// Objective: Build a complex, real-time Trading Dashboard.

interface Order {
    ClOrdID: string;
    Symbol: string;
    Side: string;
    OrderQty?: string;
    Price?: string;
    OrdStatus: string;
    TransactTime: string;
    AvgPx?: number;
    CumQty?: number;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: keyof Order | 'Progress';
    direction: SortDirection;
}

const ROW_HEIGHT = 45;

export default function Blotter() {
    const [orders, setOrders] = useState<Map<string, Order>>(new Map());
    const [connectionStatus, setConnectionStatus] = useState("Connecting...");
    const [filter, setFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OPEN, FILLED, CANCELED
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'TransactTime', direction: 'desc' });

    // Virtual Scroll State
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(600); // Default estimate

    useEffect(() => {
        if (containerRef.current) {
            setContainerHeight(containerRef.current.clientHeight);

            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    setContainerHeight(entry.contentRect.height);
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    // Connect to Backend Redis Proxy
    useEffect(() => {
        const host = window.location.hostname;

        // 1. Fetch Snapshot
        fetch(`http://${host}:8001/api/orders`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setOrders(prev => {
                        const next = new Map(prev);
                        data.forEach((o: any) => {
                            const id = o.ClOrdID || o.internal_id;
                            if (id) next.set(id, o);
                        });
                        return next;
                    });
                }
            })
            .catch(err => console.error("Failed to fetch initial state:", err));

        // 2. Subscribe to Realtime Updates
        const ws = new WebSocket(`ws://${host}:8001/ws/redis`);

        ws.onopen = () => setConnectionStatus("Connected (Realtime)");
        ws.onclose = () => setConnectionStatus("Disconnected");

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                const payload = msg.data || msg;

                if (payload.ClOrdID || payload.order_id) {
                    const id = payload.ClOrdID || payload.order_id;
                    setOrders(prev => {
                        const next = new Map(prev);
                        next.set(id, { ...(next.get(id) || {}), ...payload });
                        return next;
                    });
                }
            } catch (e) {
                console.error("Parse error", e);
            }
        };

        return () => ws.close();
    }, []);

    const handleSort = (key: keyof Order | 'Progress') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Derived State: Filtered & Sorted Lists
    const gridData = useMemo(() => {
        const list = Array.from(orders.values());

        // 1. Filter
        const filtered = list.filter(o => {
            if (statusFilter !== "ALL") {
                if (statusFilter === "OPEN" && ["FILLED", "CANCELED", "REJECTED"].includes(o.OrdStatus.toUpperCase())) return false;
                if (statusFilter === "FILLED" && o.OrdStatus.toUpperCase() !== "FILLED") return false;
            }
            if (filter) {
                return o.Symbol.toLowerCase().includes(filter.toLowerCase()) ||
                    o.ClOrdID.toLowerCase().includes(filter.toLowerCase());
            }
            return true;
        });

        // 2. Sort
        return filtered.sort((a, b) => {
            let valA: any = a[sortConfig.key as keyof Order];
            let valB: any = b[sortConfig.key as keyof Order];

            // Handle special Sort Keys
            if (sortConfig.key === 'Progress') {
                valA = a.OrdStatus === 'FILLED' ? 100 : a.OrdStatus === 'PARTIALLY_FILLED' ? 50 : 0;
                valB = b.OrdStatus === 'FILLED' ? 100 : b.OrdStatus === 'PARTIALLY_FILLED' ? 50 : 0;
            } else if (sortConfig.key === 'Price' || sortConfig.key === 'OrderQty') {
                valA = parseFloat(valA || "0");
                valB = parseFloat(valB || "0");
            } else {
                valA = (valA || "").toString().toLowerCase();
                valB = (valB || "").toString().toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [orders, filter, statusFilter, sortConfig]);

    // Statistics
    const stats = useMemo(() => {
        const totalVol = gridData.reduce((acc, o) => acc + (parseInt(o.OrderQty || "0")), 0);
        const filledCount = gridData.filter(o => o.OrdStatus?.toUpperCase() === "FILLED").length;
        return { totalOrders: gridData.length, totalVol, filledCount };
    }, [gridData]);

    // Virtualization Calculations
    const totalHeight = gridData.length * ROW_HEIGHT;
    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2; // +2 Buffer
    const visibleData = gridData.slice(startIndex, startIndex + visibleCount);

    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-2xl rounded-xl overflow-hidden border border-slate-800">
            {/* Header / Toolbar */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Trade Blotter Pro</h1>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${connectionStatus.includes("Connected") ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                            {connectionStatus}
                        </p>
                    </div>
                </div>

                {/* Stats Chips */}
                <div className="flex gap-4">
                    <StatChip label="Total Orders" value={stats.totalOrders} icon={<Activity size={14} />} />
                    <StatChip label="Volume" value={stats.totalVol.toLocaleString()} icon={<Activity size={14} />} />
                    <StatChip label="Fills" value={stats.filledCount} icon={<DollarSign size={14} />} color="text-green-400" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-slate-900/50 flex gap-4 border-b border-slate-800 shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search Symbol or ID..."
                        className="w-full bg-[#05080f] border border-slate-700 rounded-md pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>

                <div className="flex bg-[#05080f] rounded-md border border-slate-700 p-1">
                    {["ALL", "OPEN", "FILLED"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded ${statusFilter === s ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Grid Header - Sticky & Sortable */}
            <div className="flex bg-[#0f1523] text-xs uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-800 shrink-0">
                <SortableHeader label="Time" sortKey="TransactTime" currentSort={sortConfig} onSort={handleSort} width="w-20 sm:w-32" />
                <SortableHeader label="ID" sortKey="ClOrdID" currentSort={sortConfig} onSort={handleSort} width="hidden md:block w-24" />
                <SortableHeader label="Symbol" sortKey="Symbol" currentSort={sortConfig} onSort={handleSort} width="w-16 sm:w-24" />
                <SortableHeader label="Side" sortKey="Side" currentSort={sortConfig} onSort={handleSort} width="hidden sm:block w-20" />
                <SortableHeader label="Qty" sortKey="OrderQty" currentSort={sortConfig} onSort={handleSort} width="hidden sm:block w-24 text-right" />
                <SortableHeader label="Price" sortKey="Price" currentSort={sortConfig} onSort={handleSort} width="w-16 sm:w-24 text-right" />
                <SortableHeader label="Status" sortKey="OrdStatus" currentSort={sortConfig} onSort={handleSort} width="w-24 sm:w-32" />
                <SortableHeader label="Progress" sortKey="Progress" currentSort={sortConfig} onSort={handleSort} width="hidden lg:block flex-1" />
            </div>

            {/* Virtualized Data Grid Body */}
            <div
                className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#0a0f1c]"
                onScroll={onScroll}
                ref={containerRef}
            >
                <div style={{ height: totalHeight }} className="w-full relative">
                    {visibleData.map((order, index) => {
                        const actualIndex = startIndex + index;
                        const isBuy = order.Side?.toUpperCase() === 'BUY';
                        const status = order.OrdStatus?.toUpperCase() || "NEW";
                        const statusColor =
                            status === "FILLED" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                status === "CANCELED" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                    status === "NEW" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                        "bg-slate-700 text-slate-400";

                        return (
                            <div
                                key={order.ClOrdID}
                                className="absolute left-0 right-0 flex items-center border-b border-slate-800/50 hover:bg-[#131b2e] transition-colors group"
                                style={{ top: actualIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                            >
                                <div className="p-2 w-20 sm:w-32 font-mono text-slate-400 text-xs truncate">
                                    {order.TransactTime?.split('T')[1]?.split('.')[0] || order.TransactTime || "--:--:--"}
                                </div>
                                <div className="p-2 w-24 font-mono text-xs opacity-50 text-slate-500 group-hover:opacity-100 truncate hidden md:block">{order.ClOrdID}</div>
                                <div className="p-2 w-16 sm:w-24 font-bold text-white text-xs truncate">{order.Symbol}</div>
                                <div className="p-2 w-20 hidden sm:block">
                                    <span className={`font-bold text-xs ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                                        {order.Side}
                                    </span>
                                </div>
                                <div className="p-2 w-24 text-right font-mono text-slate-300 text-xs hidden sm:block">{order.OrderQty}</div>
                                <div className="p-2 w-16 sm:w-24 text-right font-mono text-yellow-500 text-xs">
                                    {order.Price ? parseFloat(order.Price).toFixed(2) : "MKT"}
                                </div>
                                <div className="p-2 w-24 sm:w-32">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${statusColor}`}>
                                        {status}
                                    </span>
                                </div>
                                <div className="p-2 flex-1 pr-4 hidden lg:block">
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${status === 'FILLED' ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: status === 'FILLED' ? '100%' : '5%' }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {gridData.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                            <Briefcase size={32} className="opacity-20 mb-2" />
                            <span className="text-sm">No orders found</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SortableHeader({ label, sortKey, currentSort, onSort, width }: any) {
    const isActive = currentSort.key === sortKey;
    return (
        <div
            className={`p-3 cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 select-none ${width}`}
            onClick={() => onSort(sortKey)}
        >
            {label}
            {isActive && (
                currentSort.direction === 'desc' ? <ArrowDown size={12} className="text-blue-400" /> : <ArrowUp size={12} className="text-blue-400" />
            )}
        </div>
    );
}

function StatChip({ label, value, icon, color = "text-white" }: any) {
    return (
        <div className="flex flex-col bg-[#05080f] px-3 py-1.5 rounded border border-slate-800 min-w-[100px]">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 mb-0.5">{icon} {label}</span>
            <span className={`text-lg font-mono font-bold leading-none ${color}`}>{value}</span>
        </div>
    );
}
