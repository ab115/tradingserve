import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Insight {
    headline: string;
    sentiment: string; // BUY, SELL, HOLD
    analysis: string;
    id: number;
}

export default function AnalystController() {
    const [isRunning, setIsRunning] = useState(false);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    // Auto-scroll ref
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Log Stream connection
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onmessage = (e) => {
            const line = e.data;
            setLogs(prev => [...prev, line]);

            // Simple Parser to structure the output
            // Expected Output per item:
            // 🤖 AI Reading: 'Headline...'
            // 📰 News: Headline...
            // 💡 AI Signal: BUY/SELL...

            if (line.includes("AI Signal:")) {
                setInsights(prev => {
                    // Try to find the last news headline from logs if not explicit
                    // But here we'll just parse the current line + context if needed.
                    // Actually, let's treat the Signal line as the trigger to form a card.

                    const signal = line.split("AI Signal:")[1].trim();
                    const id = Date.now();

                    // Finds the most recent news headline in the logs
                    // This is a bit hacky but works for demo output parsing
                    // In a real app, we'd send structured JSON.

                    return [...prev, {
                        headline: "Latest Market News", // Placeholder if we can't parse previous lines easily in this event handler without state access
                        sentiment: signal,
                        analysis: "AI model detected key sentiment indicators.",
                        id
                    }];
                });
            }
        };

        // Polling status
        const checkStatus = () => {
            fetch(`http://${host}:8001/labs/08/status`)
                .then(res => res.json())
                .then(data => setIsRunning(data.running));
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);

        return () => {
            ws.close();
            clearInterval(interval);
        };
    }, []);

    // Better Parsing Logic: Use an Effect on logs to detect full blocks?
    // Let's refine the parser. 
    // We can parse the last few logs whenever logs change to find a complete tuple.
    useEffect(() => {
        if (logs.length < 2) return;
        const last = logs[logs.length - 1];

        if (last.includes("AI Signal:")) {
            // Look back for "News:"
            const signal = last.split("AI Signal:")[1].trim().replace(/'/g, "");
            let headline = "Unknown News";

            // Search backwards for the last "News:" line
            for (let i = logs.length - 2; i >= 0; i--) {
                if (logs[i].includes("News:")) {
                    headline = logs[i].split("News:")[1].trim();
                    break;
                }
                // Also support the "AI Reading:" format if that's what outputs
                if (logs[i].includes("AI Reading:")) {
                    headline = logs[i].split("AI Reading:")[1].trim().replace(/'/g, "");
                    break;
                }
            }

            setInsights(prev => {
                // Avoid duplicates if we just added this ID?
                // Use log index or content hash as ID to prevent dupes?
                // For demo, just appending is fine, but React strict mode might double render.
                if (prev.length > 0 && prev[prev.length - 1].headline === headline && prev[prev.length - 1].sentiment === signal) return prev;

                return [...prev, {
                    id: Date.now(),
                    headline,
                    sentiment: signal,
                    analysis: "Processing global market data..."
                }];
            });

            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const toggle = async () => {
        const host = window.location.hostname;
        const endpoint = isRunning ? 'stop' : 'start';

        try {
            const res = await fetch(`http://${host}:8001/labs/08/${endpoint}`, { method: 'POST' });
            const data = await res.json();

            if (data.status === 'ok') {
                setIsRunning(!isRunning);
            }
        } catch (error) {
            console.error("Failed to toggle agent:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-2xl rounded-xl overflow-hidden border border-slate-800">
            {/* Header */}
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-lg text-purple-400">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">AI Analyst</h1>
                        <p className="text-sm text-slate-500">Lab 08: Sentiment Analysis Engine</p>
                    </div>
                </div>

                <button
                    onClick={toggle}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${isRunning
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                        : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/50'}`}
                >
                    {isRunning ? "STOP AGENT" : "RUN AGENT"}
                    {isRunning && <span className="flex h-3 w-3 relative ml-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Visual Stream */}
                <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#0a0f1c] to-[#0f1629] space-y-6">
                    {insights.length === 0 && !isRunning && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                            <Brain size={64} className="mb-4" />
                            <p>Start the Agent to analyze live news feed...</p>
                        </div>
                    )}

                    {insights.map((item, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AgentCard item={item} />
                        </div>
                    ))}
                    <div ref={bottomRef}></div>
                </div>

                {/* Raw Logs Sidebar */}
                <div className="w-80 bg-black border-l border-slate-800 p-4 font-mono text-xs overflow-y-auto hidden md:block">
                    <div className="text-slate-500 mb-2 font-bold uppercase tracking-wider">System Logs</div>
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 text-slate-400 break-words opacity-70">
                            <span className="text-slate-600 mr-2">{i + 1}</span>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AgentCard({ item }: { item: Insight }) {
    const isBuy = item.sentiment.includes("BUY");
    const isSell = item.sentiment.includes("SELL");
    const color = isBuy ? "green" : isSell ? "red" : "slate";
    const text = isBuy ? "text-green-400" : isSell ? "text-red-400" : "text-slate-400";
    const border = isBuy ? "border-green-500/30" : isSell ? "border-red-500/30" : "border-slate-500/30";
    const bg = isBuy ? "bg-green-500/5" : isSell ? "bg-red-500/5" : "bg-slate-500/5";
    const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

    return (
        <div className={`p-4 rounded-xl border ${border} ${bg} relative overflow-hidden group hover:border-opacity-50 transition-all`}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold tracking-wider">
                        <Newspaper size={12} /> News Wire
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight">"{item.headline}"</h3>
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        <span className="text-sm text-purple-300">{item.analysis}</span>
                    </div>
                </div>

                <div className={`flex flex-col items-center justify-center p-3 rounded-lg border ${border} bg-black/50 min-w-[80px]`}>
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Recommendation</span>
                    <Icon size={24} className={`${text} mb-1`} />
                    <span className={`text-xl font-black tracking-tighter ${text}`}>{item.sentiment}</span>
                </div>
            </div>
        </div>
    );
}
