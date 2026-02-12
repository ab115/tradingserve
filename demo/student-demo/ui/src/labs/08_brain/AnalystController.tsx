import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Insight {
    headline: string;
    symbol?: string; // Extracted symbol
    sentiment: string; // BUY, SELL, HOLD
    analysis: string;
    id: number;
}

export default function AnalystController() {
    const [isRunning, setIsRunning] = useState(false);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false); // Added toggle state

    // Log Buffer
    const bufferRef = useRef<string[]>([]);

    // Auto-scroll ref
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Log Stream connection
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onmessage = (e) => {
            const line = e.data;
            if (!line.includes("[Lab 08]")) return;
            bufferRef.current.unshift(line);
        };

        // Flush Buffer (Throttle to 10fps)
        const flushInterval = setInterval(() => {
            if (bufferRef.current.length > 0) {
                const currentBuffer = [...bufferRef.current];

                // Update Logs
                setLogs(prev => {
                    const newLogs = [...currentBuffer, ...prev].slice(0, 100);
                    return newLogs;
                });

                // Parse Insights (Process chronologically: Oldest -> Newest)
                [...currentBuffer].reverse().forEach(line => {
                    if (line.includes("AI Signal:")) {
                        const signal = line.split("AI Signal:")[1].trim().replace(/'/g, "");
                        let headline = "Unknown News";
                        let symbol = undefined;

                        // Search for context
                        const context = [...currentBuffer, ...logs].slice(0, 50); // Look deeper

                        for (const ctxLine of context) {
                            if (ctxLine.includes("News:")) {
                                const rawHeadline = ctxLine.split("News:")[1].trim();
                                if (!headline || headline === "Unknown News") {
                                    headline = rawHeadline;
                                    // Extract Symbol [AAPL]
                                    const match = rawHeadline.match(/\[([A-Z]+)\]/);
                                    if (match) symbol = match[1];
                                }
                                break;
                            }
                            if (ctxLine.includes("AI Reading:")) {
                                headline = ctxLine.split("AI Reading:")[1].trim().replace(/'/g, "");
                                // Try to extract symbol from reading if not found yet
                                const match = headline.match(/\[([A-Z]+)\]/);
                                if (match && !symbol) symbol = match[1];
                                break;
                            }
                        }

                        setInsights(prev => {
                            // Deduplicate: Check if this headline/signal exists in the last 5 items
                            const recent = prev.slice(-5);
                            const isDuplicate = recent.some(i => i.headline === headline && i.sentiment === signal);

                            if (isDuplicate) return prev;

                            return [...prev, {
                                id: Date.now() + Math.random(),
                                headline,
                                symbol,
                                sentiment: signal,
                                analysis: "Processing market data..."
                            }];
                        });

                        // Scroll to bottom
                        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }
                });

                bufferRef.current = [];
            }
        }, 100);

        // Polling status
        const checkStatus = () => {
            fetch(`http://${host}:8001/labs/08/status`)
                .then(res => res.json())
                .then(data => setIsRunning(data.running));
        };

        checkStatus();
        const pollInterval = setInterval(checkStatus, 2000);

        return () => {
            ws.close();
            clearInterval(flushInterval);
            clearInterval(pollInterval);
        };
    }, [logs]);

    // ... toggle logic ... (using existing function reference from closure scope, which might be stale if not careful, but `toggle` is re-defined on render. 
    // Wait, the `toggle` function is OUTSIDE useEffect, so it's fine. 
    // BUT the useEffect above depends on `logs` and re-runs on log updates. This is inefficient but functional for now.

    // To match original structure and avoid re-writing everything, I will just reference `toggle` in the return.

    const toggle = async () => {
        const host = window.location.hostname;
        const newState = !isRunning;
        const endpoint = newState ? 'start' : 'stop';

        setIsRunning(newState);

        try {
            const res = await fetch(`http://${host}:8001/labs/08/${endpoint}`, { method: 'POST' });
            const data = await res.json();
            if (data.status !== 'ok') setIsRunning(!newState);
        } catch (error) {
            console.error("Failed to toggle agent:", error);
            setIsRunning(!newState);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-lg rounded-lg overflow-hidden border border-slate-800">
            {/* Header */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-md text-purple-400">
                        <Brain size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white tracking-tight leading-none">AI Analyst</h1>
                        <p className="text-[10px] text-slate-500 mt-0.5">Lab 08: Sentiment</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${showLogs ? 'text-purple-400' : 'text-slate-500'}`}
                        title="Toggle System Logs"
                    >
                        <Newspaper size={14} />
                    </button>
                    <button
                        onClick={toggle}
                        className={`btn-glass px-4 py-1.5 text-xs ${isRunning
                            ? 'btn-glass-danger'
                            : 'btn-glass-primary'}`}
                    >
                        {isRunning ? "STOP" : "RUN"}
                        {isRunning && <span className="flex h-2 w-2 relative ml-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Visual Stream - Vertical Stack as requested */}
                <div className="flex-1 p-3 overflow-y-auto bg-gradient-to-b from-[#0a0f1c] to-[#0f1629]">
                    {insights.length === 0 && !isRunning && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                            <Brain size={48} className="mb-2" />
                            <p className="text-xs">Start Agent...</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {insights.map((item, i) => (
                            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <AgentCard item={item} />
                            </div>
                        ))}
                    </div>
                    <div ref={bottomRef}></div>
                </div>

                {/* Raw Logs Sidebar - Toggleable Overlay */}
                {showLogs && (
                    <div className="absolute top-0 right-0 h-full w-48 bg-black/95 backdrop-blur-sm border-l border-slate-800 p-2 font-mono text-[10px] overflow-y-auto animate-in slide-in-from-right duration-200 z-10 shadow-2xl">
                        <div className="text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px] flex justify-between items-center sticky top-0 bg-black/95 pb-1 border-b border-slate-800/50">
                            <span>System Logs</span>
                            <button onClick={() => setShowLogs(false)} className="hover:text-white"><Minus size={10} /></button>
                        </div>
                        {logs.map((log, i) => (
                            <div key={i} className="mb-0.5 text-slate-400 break-words opacity-70 leading-tight border-l-2 border-slate-800 pl-1">
                                <span className="text-slate-600 mr-1">{i + 1}</span>
                                {log}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AgentCard({ item }: { item: Insight }) {
    const isBuy = item.sentiment.includes("BUY");
    const isSell = item.sentiment.includes("SELL");
    // const color = isBuy ? "green" : isSell ? "red" : "slate"; // Unused
    const text = isBuy ? "text-green-400" : isSell ? "text-red-400" : "text-slate-400";
    const border = isBuy ? "border-green-500/30" : isSell ? "border-red-500/30" : "border-slate-500/30";
    const bg = isBuy ? "bg-green-500/5" : isSell ? "bg-red-500/5" : "bg-slate-500/5";
    const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

    return (
        <div className={`p-3 rounded-lg border ${border} ${bg} relative overflow-hidden group hover:border-opacity-50 transition-all`}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
                            <Newspaper size={10} /> News
                        </span>
                        {item.symbol && (
                            <span className="bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                {item.symbol}
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1 leading-tight truncate">{item.headline.replace(/\[[A-Z]+\]/, '').trim()}</h3>
                    <div className="flex items-center gap-1">
                        <Sparkles size={10} className="text-purple-400" />
                        <span className="text-[10px] text-purple-300 truncate">{item.analysis}</span>
                    </div>
                </div>

                <div className={`flex flex-col items-center justify-center p-2 rounded border ${border} bg-black/50 min-w-[60px]`}>
                    <Icon size={16} className={`${text} mb-0.5`} />
                    <span className={`text-xs font-black tracking-tighter ${text}`}>{item.sentiment}</span>
                </div>
            </div>
        </div>
    );
}
