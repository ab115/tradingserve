import { useEffect, useState, useMemo } from 'react';
import { Filter, ArrowUp, ArrowDown, Search, RefreshCw, Briefcase, DollarSign, Activity } from 'lucide-react';

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

export default function Blotter() {
    const [orders, setOrders] = useState<Map<string, Order>>(new Map());
    const [connectionStatus, setConnectionStatus] = useState("Connecting...");
    const [filter, setFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OPEN, FILLED, CANCELED

    // Connect to Backend Redis Proxy to receive simulated order updates
    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/redis`);

        ws.onopen = () => setConnectionStatus("Connected (Realtime)");
        ws.onclose = () => setConnectionStatus("Disconnected");

        ws.onmessage = (event) => {
            try {
                // Expecting { type: "ORDER_UPDATE", data: { ...fields } }
                // OR flattened object as per our recent ECN API change.
                const msg = JSON.parse(event.data);

                // Handle various formats
                const payload = msg.data || msg;

                if (payload.ClOrdID || payload.order_id) {
                    const id = payload.ClOrdID || payload.order_id;
                    setOrders(prev => {
                        const next = new Map(prev);
                        // Merge updates
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

    // Derived State: Filtered & Sorted Lists
    const gridData = useMemo(() => {
        const list = Array.from(orders.values());
        return list
            .filter(o => {
                if (statusFilter !== "ALL") {
                    if (statusFilter === "OPEN" && ["FILLED", "CANCELED", "REJECTED"].includes(o.OrdStatus.toUpperCase())) return false;
                    if (statusFilter === "FILLED" && o.OrdStatus.toUpperCase() !== "FILLED") return false;
                }
                if (filter) {
                    return o.Symbol.toLowerCase().includes(filter.toLowerCase()) ||
                        o.ClOrdID.toLowerCase().includes(filter.toLowerCase());
                }
                return true;
            })
            .sort((a, b) => (b.TransactTime || "").localeCompare(a.TransactTime || ""));
    }, [orders, filter, statusFilter]);

    // Statistics
    const stats = useMemo(() => {
        const list = Array.from(orders.values());
        const totalVol = list.reduce((acc, o) => acc + (parseInt(o.OrderQty || "0")), 0);
        const filledCount = list.filter(o => o.OrdStatus?.toUpperCase() === "FILLED").length;
        return { totalOrders: list.length, totalVol, filledCount };
    }, [orders]);

    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-2xl rounded-xl overflow-hidden border border-slate-800">
            {/* Header / Toolbar */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
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
            <div className="p-3 bg-slate-900/50 flex gap-4 border-b border-slate-800">
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

            {/* Data Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0f1523] sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                        <tr>
                            <th className="p-4 border-b border-slate-800 w-24">Time</th>
                            <th className="p-4 border-b border-slate-800">ID</th>
                            <th className="p-4 border-b border-slate-800">Symbol</th>
                            <th className="p-4 border-b border-slate-800">Side</th>
                            <th className="p-4 border-b border-slate-800 text-right">Qty</th>
                            <th className="p-4 border-b border-slate-800 text-right">Price</th>
                            <th className="p-4 border-b border-slate-800">Status</th>
                            <th className="p-4 border-b border-slate-800 text-right">Progress</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm">
                        {gridData.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-slate-600">
                                    <div className="flex flex-col items-center gap-2">
                                        <Briefcase size={24} className="opacity-20" />
                                        <span>No orders found</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {gridData.map((order) => {
                            const isBuy = order.Side?.toUpperCase() === 'BUY';
                            const status = order.OrdStatus?.toUpperCase() || "NEW";
                            const statusColor =
                                status === "FILLED" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                    status === "CANCELED" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                        status === "NEW" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                            "bg-slate-700 text-slate-400";

                            return (
                                <tr key={order.ClOrdID} className="group hover:bg-[#131b2e] transition-colors">
                                    <td className="p-4 font-mono text-slate-400 text-xs">
                                        {order.TransactTime?.split('T')[1]?.split('.')[0] || order.TransactTime || "--:--:--"}
                                    </td>
                                    <td className="p-4 font-mono text-xs opacity-50 group-hover:opacity-100">{order.ClOrdID.slice(0, 8)}...</td>
                                    <td className="p-4 font-bold text-white">{order.Symbol}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                                            {order.Side}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-mono text-slate-300">{order.OrderQty}</td>
                                    <td className="p-4 text-right font-mono text-yellow-500">
                                        {order.Price ? parseFloat(order.Price).toFixed(2) : "MKT"}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${statusColor}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {/* Simple Progress Bar for Partial Fills */}
                                        <div className="w-24 ml-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${status === 'FILLED' ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: status === 'FILLED' ? '100%' : '5%' }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
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
