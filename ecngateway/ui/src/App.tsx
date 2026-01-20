import { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, Server, Radio, Zap, Search, Filter, MessageSquare, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

// Types
interface Session {
    session_id: string;
    status: string;
}

interface Order {
    internal_id: string;
    ClOrdID?: string;
    OrigClOrdID?: string;
    Symbol?: string;
    Side?: string;
    OrderQty?: string;
    Price?: string;
    OrdType?: string;
    RequestType?: string;
    Status?: string; // Derived status
    OrdStatus?: string; // Raw status from FIX
    MsgType?: string; // FIX MsgType
    TransactTime?: string;
    SendingTime?: string;
    SenderCompID?: string;
    // ...
}

interface AdminMessage {
    type: string;
    session_id: string;
    data: any;
    timestamp?: string;
}

type SortDirection = 'asc' | 'desc'

interface SortConfig<T> {
    key: keyof T;
    direction: SortDirection;
}

function App() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [rawOrders, setRawOrders] = useState<Order[]>([])
    const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([])

    const [status, setStatus] = useState("Connecting...")
    const [selectedSession, setSelectedSession] = useState<string | null>(null)
    const [searchText, setSearchText] = useState("")

    // Sorting State
    const [orderSort, setOrderSort] = useState<SortConfig<Order> | null>(null)
    const [adminSort, setAdminSort] = useState<SortConfig<AdminMessage> | null>(null)

    // Resizing State
    const [topHeight, setTopHeight] = useState(60)
    const isDragging = useRef(false)

    const wsRef = useRef<WebSocket | null>(null)

    // Data Consolidation Logic
    const consolidatedOrders = useMemo(() => {
        // Map ClOrdID -> Order
        const map = new Map<string, Order>();

        // Sort raw orders by time (or internal_id heuristic if time missing) to replay history
        const sorted = [...rawOrders].sort((a, b) => {
            const tA = a.TransactTime || a.SendingTime || "";
            const tB = b.TransactTime || b.SendingTime || "";
            return tA.localeCompare(tB);
        });

        sorted.forEach(o => {
            const reqType = o.RequestType || "New";
            const msgType = o.MsgType;

            if (msgType === '8') {
                // Execution Report (Fill/PartialFill/New/Rejected/Canceled)
                const id = o.ClOrdID || o.internal_id;
                if (map.has(id)) {
                    const original = map.get(id)!;
                    map.set(id, {
                        ...original,
                        ...o,
                        Status: o.Status || o.OrdStatus || original.Status
                    });
                } else {
                    // Orphaned report or first time seeing it (if we missed New)
                    map.set(id, { ...o, Status: o.Status || o.OrdStatus || 'New' });
                }
            } else if (reqType === 'Cancel') {
                // Find original and mark canceled
                // We check both map keys (ClOrdID) and try to match OrigClOrdID
                const origId = o.OrigClOrdID;
                if (origId && map.has(origId)) {
                    const original = map.get(origId)!;
                    map.set(origId, { ...original, Status: 'Canceled' });
                }
                // We generally don't show the cancel request itself in the blotter if it successfully maps
                // unless it failed? For now, we hide the request row itself to keep blotter clean
            } else if (reqType === 'Replace') {
                const origId = o.OrigClOrdID;
                if (origId && map.has(origId)) {
                    const original = map.get(origId)!;
                    // Remove old key
                    map.delete(origId);
                    // Add new key with updated details. Use new ClOrdID
                    // Merge original details (like Symbol) with new details (Price/Qty)
                    const newId = o.ClOrdID || o.internal_id;
                    map.set(newId, {
                        ...original,
                        ...o,
                        Status: 'Replaced',
                        RequestType: 'Replaced',
                        internal_id: newId
                    });
                } else {
                    // Orphaned replace? Show as is
                    map.set(o.ClOrdID || o.internal_id, { ...o, Status: 'New' });
                }
            } else {
                // New Order (or just unknown type treated as new)
                // Use ClOrdID as key
                const id = o.ClOrdID || o.internal_id;
                map.set(id, { ...o, Status: 'New' });
            }
        });

        return Array.from(map.values());
    }, [rawOrders]);


    // Generic Sort Function
    const sortData = <T,>(data: T[], config: SortConfig<T> | null) => {
        if (!config) return data;
        return [...data].sort((a, b) => {
            const aVal = a[config.key];
            const bVal = b[config.key];

            if (aVal === bVal) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
            return config.direction === 'asc' ? comparison : -comparison;
        });
    };

    // Filter & Sort Logic: Orders (Using Consolidated List)
    const processedOrders = useMemo(() => {
        const filtered = consolidatedOrders.filter(o => {
            if (selectedSession && o.SenderCompID && !selectedSession.includes(o.SenderCompID)) {
                return false
            }
            if (searchText) {
                const lower = searchText.toLowerCase()
                return (
                    o.ClOrdID?.toLowerCase().includes(lower) ||
                    o.Symbol?.toLowerCase().includes(lower) ||
                    o.internal_id?.toLowerCase().includes(lower) ||
                    o.SenderCompID?.toLowerCase().includes(lower)
                )
            }
            return true
        })
        return sortData(filtered, orderSort)
    }, [consolidatedOrders, selectedSession, searchText, orderSort])

    // Filter & Sort Logic: Admin Messages (Raw List is fine)
    const processedAdminMessages = useMemo(() => {
        const filtered = adminMessages.filter(m => {
            if (selectedSession && m.session_id !== selectedSession) {
                return false
            }
            return true
        })
        return sortData(filtered, adminSort)
    }, [adminMessages, selectedSession, adminSort])

    const handleReset = async () => {
        if (!confirm("Are you sure you want to CLEAR ALL DATA? This cannot be undone.")) return;

        try {
            // Use relative path via Nginx
            const apiBase = `/ecn/api`;

            await fetch(`${apiBase}/reset`, { method: "POST" });
            console.log("Reset command sent.");
            // WS will handle the cleanup update
        } catch (e) {
            console.error("Reset failed", e);
            alert("Failed to reset data");
        }
    };

    // Initial Fetch
    useEffect(() => {
        const fetchData = async () => {
            // Use relative path via Nginx
            const apiBase = `/ecn/api`;

            try {
                const sRes = await fetch(`${apiBase}/sessions`)
                const sData = await sRes.json()
                setSessions(sData)

                // Fetch RAW orders (includes cancels/replaces)
                const oRes = await fetch(`${apiBase}/orders`)
                const oData = await oRes.json()
                setRawOrders(oData)

                const aRes = await fetch(`${apiBase}/admin/messages`)
                const aData = await aRes.json()
                setAdminMessages(aData)

                setStatus("Connected (REST)")
            } catch (e) {
                console.error("Fetch error", e)
                setStatus("Error Fetching Data")
            }
        }
        fetchData()

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Construct absolute WS URL relative to current host
        const wsUrl = `${wsProtocol}//${window.location.host}/ecn/ws`;

        const ws = new WebSocket(wsUrl)
        ws.onopen = () => setStatus("Live (WS)")
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            const { channel, payload } = msg

            if (channel === "updates:orders") {
                if (payload.type === "RESET") {
                    // Clear all data
                    setRawOrders([]);
                    setSessions([]);
                    setAdminMessages([]);
                    console.log("Received RESET event. Cleared clean.");
                    return;
                }
                // Append to RAW orders list
                setRawOrders(prev => {
                    return [payload, ...prev] // Order doesn't matter much since we sort in memo, but recent first is good default
                })
            } else if (channel === "updates:sessions") {
                setSessions(prev => {
                    const idx = prev.findIndex(s => s.session_id === payload.session_id)
                    if (idx >= 0) {
                        const newArr = [...prev]
                        newArr[idx] = { ...newArr[idx], status: payload.type || "Updated" }
                        return newArr
                    }
                    return [...prev, { session_id: payload.session_id, status: payload.type || "New" }]
                })
                setAdminMessages(prev => [payload, ...prev].slice(0, 100))
            }
        }
        ws.onclose = () => setStatus("Disconnected")
        wsRef.current = ws

        return () => ws.close()
    }, [])

    // Resizing Handlers
    const handleMouseDown = () => { isDragging.current = true }
    const handleMouseUp = () => { isDragging.current = false }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return
        const containerHeight = window.innerHeight - 40
        const newHeight = (e.clientY - 40) / containerHeight * 100
        if (newHeight > 20 && newHeight < 80) {
            setTopHeight(newHeight)
        }
    }

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp)
        return () => window.removeEventListener('mouseup', handleMouseUp)
    }, [])

    // Sorting Handlers
    const handleOrderSort = (key: keyof Order) => {
        setOrderSort(current => {
            if (current?.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null
            }
            return { key, direction: 'asc' }
        })
    }

    const handleAdminSort = (key: keyof AdminMessage) => {
        setAdminSort(current => {
            if (current?.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null
            }
            return { key, direction: 'asc' }
        })
    }

    // Sort Icon Helper
    const SortIcon = ({ active, direction }: { active: boolean, direction?: SortDirection }) => {
        if (!active) return <ArrowUpDown size={12} className="opacity-20" />
        return direction === 'asc' ? <ArrowUp size={12} className="text-bloomberg-orange" /> : <ArrowDown size={12} className="text-bloomberg-orange" />
    }

    return (
        <div
            className="bloomberg-app h-screen flex flex-col bg-bloomberg-bg text-bloomberg-text font-mono select-none"
            onMouseMove={handleMouseMove}
        >
            {/* Header */}
            <header className="h-10 bg-black border-b border-bloomberg-orange flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-bloomberg-orange font-bold tracking-widest">ECN <span className="text-white">PRO</span></span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleReset}
                        className="text-xs bg-red-900 text-red-100 px-2 py-1 rounded hover:bg-red-700 transition-colors uppercase font-bold tracking-wider"
                    >
                        Reset System
                    </button>

                    <div className="text-xs text-bloomberg-text-dim flex gap-4">
                        <span className="flex items-center gap-1">
                            <Activity size={14} className={status.includes("Live") ? "text-green-500" : "text-red-500"} />
                            {status}
                        </span>
                        <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left Panel */}
                <aside className="w-64 bg-bloomberg-panel border-r border-bloomberg-border flex flex-col shrink-0">
                    <div className="p-2 border-b border-bloomberg-border flex justify-between items-center">
                        <h3 className="text-bloomberg-orange text-sm uppercase font-bold">Connections</h3>
                        <Server size={14} className="text-bloomberg-text-dim" />
                    </div>
                    <div className="p-2 space-y-2 overflow-y-auto flex-1">
                        {sessions.length === 0 && <div className="text-xs text-bloomberg-text-dim italic">No sessions active</div>}
                        {sessions.map(s => (
                            <div
                                key={s.session_id}
                                onClick={() => setSelectedSession(selectedSession === s.session_id ? null : s.session_id)}
                                className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${selectedSession === s.session_id
                                    ? 'bg-bloomberg-orange text-black border-bloomberg-orange'
                                    : 'bg-black border-bloomberg-border hover:bg-gray-900'
                                    }`}
                            >
                                <span className="text-xs truncate" title={s.session_id}>{s.session_id}</span>
                                {(s.status === 'Logon' || s.status === 'Connected') ?
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${selectedSession === s.session_id ? 'bg-black' : 'bg-green-500'}`}></div> :
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                }
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Right Panel */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Top: Order Blotter */}
                    <div style={{ height: `${topHeight}%` }} className="flex flex-col min-h-0">
                        <div className="p-2 border-b border-bloomberg-border flex justify-between items-center bg-bloomberg-panel shrink-0">
                            <div className="flex items-center gap-4">
                                <h3 className="text-bloomberg-orange text-sm uppercase font-bold m-0 border-0 p-0">Order Blotter (Live)</h3>
                                {selectedSession && (
                                    <span className="text-xs bg-bloomberg-orange text-black px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                        <Filter size={10} /> {selectedSession}
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedSession(null); }} className="hover:text-white ml-1">×</button>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2 top-1.5 text-bloomberg-text-dim" />
                                    <input
                                        type="text"
                                        placeholder="Filter..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="bg-black border border-bloomberg-border rounded pl-8 pr-2 py-1 text-xs text-bloomberg-text focus:border-bloomberg-orange outline-none w-32 focus:w-48 transition-all"
                                    />
                                </div>
                                <Zap size={14} className="text-bloomberg-text-dim" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-black">
                            <table className="w-full text-left text-xs table-fixed">
                                <thead className="bg-bloomberg-panel text-bloomberg-text-dim sticky top-0 cursor-pointer select-none">
                                    <tr>
                                        {[
                                            { id: 'TransactTime', label: 'Time', width: 'w-20' },
                                            { id: 'ClOrdID', label: 'ID', width: 'w-24' },
                                            { id: 'Symbol', label: 'Symbol', width: 'w-20' },
                                            { id: 'Side', label: 'Side', width: 'w-16' },
                                            { id: 'OrderQty', label: 'Qty', width: 'w-20' },
                                            { id: 'Price', label: 'Price', width: 'w-20' },
                                            { id: 'OrdType', label: 'Type', width: 'w-16' },
                                            { id: 'Status', label: 'Status', width: 'w-24' }
                                        ].map(col => (
                                            <th
                                                key={col.id}
                                                className={`p-2 ${col.width} hover:bg-white/5 transition-colors`}
                                                onClick={() => handleOrderSort(col.id as keyof Order)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {col.label}
                                                    <SortIcon active={orderSort?.key === col.id} direction={orderSort?.direction} />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedOrders.map((o, idx) => (
                                        <tr key={idx} className={`border-b border-bloomberg-border hover:bg-gray-900 font-mono ${o.Status === 'Canceled' ? 'text-gray-500 line-through' : ''}`}>
                                            <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-bloomberg-text-dim">
                                                {o.TransactTime ? o.TransactTime.split('-').pop() : (o.internal_id?.substring(0, 8) || "N/A")}
                                            </td>
                                            <td className="p-2 text-bloomberg-blue truncate" title={o.ClOrdID}>{o.ClOrdID}</td>
                                            <td className={`p-2 font-bold ${o.Status === 'Canceled' ? 'text-gray-500' : 'text-yellow-400'}`}>{o.Symbol}</td>
                                            <td className={`p-2 ${o.Status === 'Canceled' ? 'text-gray-500' : o.Side === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{o.Side}</td>
                                            <td className="p-2">{o.OrderQty}</td>
                                            <td className="p-2">{o.Price}</td>
                                            <td className="p-2">{o.OrdType === '1' ? 'MKT' : o.OrdType === '2' ? 'LMT' : o.OrdType}</td>
                                            <td className={`p-2 font-bold ${o.Status === 'Canceled' ? 'text-red-500' : o.Status === 'Replaced' ? 'text-blue-400' : 'text-gray-300'}`}>{o.Status || "New"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Resizer Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="h-2 bg-bloomberg-border hover:bg-bloomberg-orange cursor-row-resize shrink-0 flex items-center justify-center transition-colors"
                    >
                        <div className="w-8 h-1 bg-gray-600 rounded-full"></div>
                    </div>

                    {/* Bottom: Admin Messages (Same) */}
                    <div className="flex-1 flex flex-col min-h-0 bg-bloomberg-panel">
                        {/* ... (Same Admin Grid Header) ... */}
                        <div className="p-2 border-b border-bloomberg-border flex justify-between items-center shrink-0">
                            <h3 className="text-bloomberg-orange text-sm uppercase font-bold">Admin Messages</h3>
                            <MessageSquare size={14} className="text-bloomberg-text-dim" />
                        </div>
                        <div className="flex-1 overflow-auto bg-black">
                            <table className="w-full text-left text-xs table-fixed">
                                <thead className="bg-bloomberg-panel text-bloomberg-text-dim sticky top-0 cursor-pointer select-none">
                                    <tr>
                                        {[
                                            { id: 'timestamp', label: 'Time', width: 'w-24' },
                                            { id: 'type', label: 'Type', width: 'w-24' },
                                            { id: 'session_id', label: 'Session', width: 'w-48' },
                                            { id: 'data', label: 'Data', width: 'auto' }
                                        ].map(col => (
                                            <th
                                                key={col.id}
                                                className={`p-2 ${col.width} hover:bg-white/5 transition-colors`}
                                                onClick={() => handleAdminSort(col.id as keyof AdminMessage)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {col.label}
                                                    <SortIcon active={adminSort?.key === col.id} direction={adminSort?.direction} />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedAdminMessages.map((m, idx) => (
                                        <tr key={idx} className="border-b border-bloomberg-border hover:bg-gray-900 font-mono">
                                            <td className="p-2 text-bloomberg-text-dim whitespace-nowrap">
                                                {m.timestamp ? m.timestamp.split('-').pop() : "N/A"}
                                            </td>
                                            <td className={`p-2 font-bold ${m.type === 'Logon' ? 'text-green-400' : m.type === 'Logout' ? 'text-red-400' : 'text-blue-400'}`}>
                                                {m.type}
                                            </td>
                                            <td className="p-2 text-gray-400 truncate" title={m.session_id}>
                                                {m.session_id}
                                            </td>
                                            <td className="p-2 text-gray-500 truncate font-mono text-[10px]" title={JSON.stringify(m.data)}>
                                                {JSON.stringify(m.data)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    )
}

export default App
