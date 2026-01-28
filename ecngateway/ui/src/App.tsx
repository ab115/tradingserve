import { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, Server, Filter, Zap, Search, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { DataGrid, ColumnDef } from '@tradingserver/ui-core'

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
    Status?: string;
    OrdStatus?: string;
    MsgType?: string;
    TransactTime?: string;
    SendingTime?: string;
    SenderCompID?: string;
    TargetCompID?: string;
}

interface AdminMessage {
    type: string;
    session_id: string;
    data: any;
    timestamp?: string;
}

function App() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [rawOrders, setRawOrders] = useState<Order[]>([])
    const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([])
    const [status, setStatus] = useState("Connecting...")
    const [selectedSession, setSelectedSession] = useState<string | null>(null)
    const [searchText, setSearchText] = useState("")
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    // Resizing State
    const [topHeight, setTopHeight] = useState(60)
    const isDragging = useRef(false)

    const wsRef = useRef<WebSocket | null>(null)

    // Helper for Safe Date Formatting
    const formatTime = (isoString?: string) => {
        if (!isoString) return "N/A";
        try {
            if (isoString.includes('T')) {
                return new Date(isoString).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
            }
            return isoString;
        } catch {
            return isoString;
        }
    }

    // Data Consolidation Logic
    const consolidatedOrders = useMemo(() => {
        const map = new Map<string, Order>();
        const sorted = [...rawOrders].sort((a, b) => {
            const tA = a.TransactTime || a.SendingTime || "";
            const tB = b.TransactTime || b.SendingTime || "";
            return tA.localeCompare(tB);
        });

        sorted.forEach(o => {
            const reqType = o.RequestType || "New";
            const msgType = o.MsgType;

            if (msgType === '8') {
                const id = o.ClOrdID || o.internal_id;
                if (map.has(id)) {
                    const original = map.get(id)!;
                    map.set(id, { ...original, ...o, Status: o.Status || o.OrdStatus || original.Status });
                } else {
                    map.set(id, { ...o, Status: o.Status || o.OrdStatus || 'New' });
                }
            } else if (reqType === 'Cancel') {
                const origId = o.OrigClOrdID;
                if (origId && map.has(origId)) {
                    const original = map.get(origId)!;
                    map.set(origId, { ...original, Status: 'Canceled' });
                }
            } else if (reqType === 'Replace') {
                const origId = o.OrigClOrdID;
                if (origId && map.has(origId)) {
                    const original = map.get(origId)!;
                    map.delete(origId);
                    const newId = o.ClOrdID || o.internal_id;
                    map.set(newId, { ...original, ...o, Status: 'Replaced', RequestType: 'Replaced', internal_id: newId });
                } else {
                    map.set(o.ClOrdID || o.internal_id, { ...o, Status: 'New' });
                }
            } else {
                const id = o.ClOrdID || o.internal_id;
                map.set(id, { ...o, Status: 'New' });
            }
        });

        return Array.from(map.values()).reverse(); // Newest first
    }, [rawOrders]);

    // Filtering Logic
    const processedOrders = useMemo(() => {
        return consolidatedOrders.filter(o => {
            if (selectedSession) {
                const s = selectedSession;
                const sender = o.SenderCompID || "";
                const target = o.TargetCompID || "";
                const match = s.includes(sender) && s.includes(target);
                if (!match) return false;
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
    }, [consolidatedOrders, selectedSession, searchText])

    const processedAdminMessages = useMemo(() => {
        return adminMessages.filter(m => {
            if (selectedSession && m.session_id !== selectedSession) return false
            return true
        })
    }, [adminMessages, selectedSession])

    // DataGrid Definitions
    const orderColumns: ColumnDef<Order>[] = [
        {
            key: 'TransactTime',
            label: 'Time',
            width: 100,
            render: (o) => formatTime(o.TransactTime) || (o.internal_id?.substring(0, 8) || "N/A")
        },
        { key: 'ClOrdID', label: 'ID', width: 120 },
        {
            key: 'Symbol',
            label: 'Symbol',
            width: 80,
            render: (o) => <span className={`font-bold ${o.Status === 'Canceled' ? 'text-gray-500' : 'text-yellow-400'}`}>{o.Symbol}</span>
        },
        {
            key: 'Side',
            label: 'Side',
            width: 60,
            render: (o) => <span className={o.Status === 'Canceled' ? 'text-gray-500' : o.Side === 'Buy' ? 'text-green-400' : 'text-red-400'}>{o.Side}</span>
        },
        { key: 'OrderQty', label: 'Qty', width: 80 },
        { key: 'Price', label: 'Price', width: 80 },
        {
            key: 'OrdType',
            label: 'Type',
            width: 60,
            render: (o) => o.OrdType === '1' ? 'MKT' : o.OrdType === '2' ? 'LMT' : o.OrdType
        },
        {
            key: 'Status',
            label: 'Status',
            width: 100,
            render: (o) => <span className={`font-bold ${o.Status === 'Canceled' ? 'text-red-500' : o.Status === 'Replaced' ? 'text-blue-400' : 'text-gray-300'}`}>{o.Status || "New"}</span>
        }
    ];

    const adminColumns: ColumnDef<AdminMessage>[] = [
        {
            key: 'timestamp',
            label: 'Time',
            width: 120,
            render: (m) => formatTime(m.timestamp)
        },
        {
            key: 'type',
            label: 'Type',
            width: 100,
            render: (m) => <span className={`font-bold ${m.type === 'Logon' ? 'text-green-400' : m.type === 'Logout' ? 'text-red-400' : 'text-blue-400'}`}>{m.type}</span>
        },
        { key: 'session_id', label: 'Session', width: 200 },
        {
            key: 'data',
            label: 'Data',
            flex: 1,
            render: (m) => <span className="text-gray-500 font-mono text-[10px] truncate">{JSON.stringify(m.data)}</span>
        }
    ];

    const handleReset = async () => {
        if (!confirm("Are you sure you want to CLEAR ALL DATA? This cannot be undone.")) return;
        try {
            await fetch(`/ecn/api/reset`, { method: "POST" });
        } catch (e) {
            alert("Failed to reset data");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sRes = await fetch(`/ecn/api/sessions`)
                const sData = await sRes.json()
                setSessions(sData)

                const oRes = await fetch(`/ecn/api/orders`)
                const oData = await oRes.json()
                setRawOrders(oData)

                const aRes = await fetch(`/ecn/api/admin/messages`)
                const aData = await aRes.json()
                setAdminMessages(aData)
                setStatus("Connected (REST)")
            } catch (e) { setStatus("Error Fetching Data") }
        }
        fetchData()

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ecn/ws`;
        const ws = new WebSocket(wsUrl)
        ws.onopen = () => setStatus("Live (WS)")
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            const { channel, payload } = msg
            if (channel === "updates:orders") {
                if (payload.type === "RESET") {
                    setRawOrders([]); setSessions([]); setAdminMessages([]); return;
                }
                setRawOrders(prev => [payload, ...prev])
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

    const handleMouseDown = () => { isDragging.current = true }
    const handleMouseUp = () => { isDragging.current = false }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return
        const containerHeight = window.innerHeight - 40
        const newHeight = (e.clientY - 40) / containerHeight * 100
        if (newHeight > 20 && newHeight < 80) setTopHeight(newHeight)
    }

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp)
        return () => window.removeEventListener('mouseup', handleMouseUp)
    }, [])

    return (
        <div className="bloomberg-app h-screen flex flex-col bg-bloomberg-bg text-bloomberg-text font-mono select-none" onMouseMove={handleMouseMove}>
            {/* Header */}
            <header className="h-10 bg-black border-b border-bloomberg-orange flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-bloomberg-orange hover:text-white transition-colors"
                        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <span className="text-bloomberg-orange font-bold tracking-widest">ECN <span className="text-white">PRO</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleReset} className="text-xs bg-red-900 text-red-100 px-2 py-1 rounded hover:bg-red-700 transition-colors uppercase font-bold tracking-wider">RESET SYSTEM</button>
                    <div className="text-xs text-bloomberg-text-dim flex gap-4">
                        <span className="flex items-center gap-1"><Activity size={14} className={status.includes("Live") ? "text-green-500" : "text-red-500"} />{status}</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Collapsible Left Panel */}
                <aside
                    className={`bg-bloomberg-panel border-r border-bloomberg-border flex flex-col shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
                >
                    <div className="p-2 border-b border-bloomberg-border flex justify-between items-center whitespace-nowrap">
                        <h3 className="text-bloomberg-orange text-sm uppercase font-bold">Connections</h3>
                        <Server size={14} className="text-bloomberg-text-dim" />
                    </div>
                    <div className="p-2 space-y-2 overflow-y-auto flex-1 min-w-[16rem]">
                        {sessions.length === 0 && <div className="text-xs text-bloomberg-text-dim italic">No sessions active</div>}
                        {sessions.map(s => (
                            <div key={s.session_id} onClick={() => setSelectedSession(selectedSession === s.session_id ? null : s.session_id)} className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${selectedSession === s.session_id ? 'bg-bloomberg-orange text-black border-bloomberg-orange' : 'bg-black border-bloomberg-border hover:bg-gray-900'}`}>
                                <span className="text-xs truncate" title={s.session_id}>{s.session_id}</span>
                                <div className={`w-2 h-2 rounded-full ${s.status === 'Logon' || s.status === 'Connected' ? (selectedSession === s.session_id ? 'bg-black animate-pulse' : 'bg-green-500 animate-pulse') : 'bg-red-500'}`}></div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Right Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top: Order Blotter */}
                    <div style={{ height: `${topHeight}%` }} className="flex flex-col min-h-0 relative group">
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
                                    <input type="text" placeholder="Filter..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="bg-black border border-bloomberg-border rounded pl-8 pr-2 py-1 text-xs text-bloomberg-text focus:border-bloomberg-orange outline-none w-32 focus:w-48 transition-all" />
                                </div>
                                <Zap size={14} className="text-bloomberg-text-dim" />
                            </div>
                        </div>
                        <div className="flex-1 bg-black overflow-hidden relative">
                            <DataGrid
                                columns={orderColumns}
                                data={processedOrders}
                                rowHeight={32}
                                className="h-full border-none"
                                headerClassName="bg-bloomberg-panel text-bloomberg-text-dim text-xs uppercase"
                                rowClassName="border-b border-bloomberg-border hover:bg-white/5 transition-colors text-xs"
                            />
                        </div>
                    </div>

                    {/* Resizer Handle */}
                    <div onMouseDown={handleMouseDown} className="h-2 bg-bloomberg-border hover:bg-bloomberg-orange cursor-row-resize shrink-0 flex items-center justify-center transition-colors z-10">
                        <div className="w-8 h-1 bg-gray-600 rounded-full"></div>
                    </div>

                    {/* Bottom: Admin Messages */}
                    <div className="flex-1 flex flex-col min-h-0 bg-bloomberg-panel relative">
                        <div className="p-2 border-b border-bloomberg-border flex justify-between items-center shrink-0">
                            <h3 className="text-bloomberg-orange text-sm uppercase font-bold">Admin Messages</h3>
                            <MessageSquare size={14} className="text-bloomberg-text-dim" />
                        </div>
                        <div className="flex-1 bg-black overflow-hidden relative">
                            <DataGrid
                                columns={adminColumns}
                                data={processedAdminMessages}
                                rowHeight={32}
                                className="h-full border-none"
                                headerClassName="bg-bloomberg-panel text-bloomberg-text-dim text-xs uppercase"
                                rowClassName="border-b border-bloomberg-border hover:bg-white/5 transition-colors text-xs"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
export default App
