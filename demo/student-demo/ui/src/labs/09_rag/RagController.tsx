import { useState, useEffect, useRef } from 'react';
import { Database, Search, MessageSquare, FileText, Play, Square, TrendingUp, ShieldAlert, Cpu, Bitcoin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface QaItem {
    query: string;
    answer: string;
    id: number;
}

const SCENARIOS = [
    { id: "default", label: "General Knowledge", icon: FileText, color: "text-cyan-400" },
    { id: "fed_minutes", label: "Fed Minutes", icon: TrendingUp, color: "text-green-400" },
    { id: "tech_earnings", label: "Tech Earnings", icon: Cpu, color: "text-purple-400" },
    { id: "crypto_reg", label: "Crypto Regulation", icon: Bitcoin, color: "text-orange-400" },
];

export default function RagController() {
    const [isRunning, setIsRunning] = useState(false);
    const [qaList, setQaList] = useState<QaItem[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [activeScenario, setActiveScenario] = useState("default");

    const bottomRef = useRef<HTMLDivElement>(null);
    const lastQueryRef = useRef<string>("Context Search...");

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [qaList, logs]);

    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onmessage = (e) => {
            const line = e.data;
            if (!line.includes("[Lab 09]")) return;

            setLogs(prev => [...prev, line]);

            // Parse Output Stream safely
            if (line.includes("Query:")) {
                lastQueryRef.current = line.split("Query:")[1].trim();
            }

            if (line.includes("Answer:")) {
                const answer = line.split("Answer:")[1].trim();
                const query = lastQueryRef.current;

                setQaList(prev => {
                    // Dedupe
                    if (prev.length > 0 && prev[prev.length - 1].answer === answer) return prev;
                    return [...prev, { id: Date.now(), query, answer }];
                });
            }
        };

        // Polling status
        const checkStatus = () => {
            fetch(`http://${host}:8001/labs/09/status`)
                .then(res => res.json())
                .then(data => setIsRunning(data.running));
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);

        return () => {
            ws.close();
            clearInterval(interval);
        };
    }, []); // Empty dependency array fixed the flakiness!

    const toggle = async () => {
        const host = window.location.hostname;
        if (isRunning) {
            await fetch(`http://${host}:8001/labs/09/stop`, { method: 'POST' });
        } else {
            setQaList([]); // Clear previous run
            await fetch(`http://${host}:8001/labs/09/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: activeScenario })
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-2xl rounded-xl overflow-hidden border border-slate-800">
            {/* Header */}
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-cyan-500/10 p-3 rounded-lg text-cyan-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">RAG Analyst</h1>
                        <p className="text-sm text-slate-500">Retrieval Augmented Generation with Context</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Scenario Selector */}
                    <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {SCENARIOS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveScenario(s.id)}
                                disabled={isRunning}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${activeScenario === s.id
                                        ? `bg-slate-800 text-white shadow-sm border border-slate-700`
                                        : `text-slate-500 hover:text-slate-300 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`
                                    }`}
                            >
                                <s.icon size={14} className={activeScenario === s.id ? s.color : ""} />
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={toggle}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${isRunning
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                            : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/50'}`}
                    >
                        {isRunning ? <><Square size={16} fill="currentColor" /> STOP</> : <><Play size={16} fill="currentColor" /> RUN ANALYST</>}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Visual Stream */}
                <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#0a0f1c] to-[#0f1629] space-y-6">
                    {qaList.length === 0 && !isRunning && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                            <Database size={64} className="mb-4 animate-pulse" />
                            <p>Select a scenario and run the analyst to query the Knowledge Base...</p>
                        </div>
                    )}

                    {qaList.map((item, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                            {/* User Query Bubble */}
                            <div className="self-end max-w-[80%]">
                                <div className="flex items-center justify-end gap-2 text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">
                                    User Query <Search size={12} />
                                </div>
                                <div className="bg-cyan-900/20 border border-cyan-500/30 text-cyan-100 p-4 rounded-2xl rounded-tr-none shadow-lg backdrop-blur-sm">
                                    "{item.query}"
                                </div>
                            </div>

                            {/* AI Answer Bubble */}
                            <div className="self-start max-w-[80%]">
                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">
                                    <MessageSquare size={12} /> AI Response
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 text-slate-200 p-4 rounded-2xl rounded-tl-none shadow-lg prose prose-invert prose-sm">
                                    <ReactMarkdown>{item.answer}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef}></div>
                </div>

                {/* Raw Logs Sidebar */}
                <div className="w-80 bg-black border-l border-slate-800 p-4 font-mono text-xs overflow-y-auto hidden lg:block">
                    <div className="text-slate-500 mb-2 font-bold uppercase tracking-wider">RAG Chain Process</div>
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 text-slate-400 break-words opacity-70 border-b border-slate-900/50 pb-1">
                            {log.includes("Indexing") || log.includes("Retrieving")
                                ? <span className="text-yellow-500">{log}</span>
                                : log.includes("Synthesizing")
                                    ? <span className="text-purple-400">{log}</span>
                                    : log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
