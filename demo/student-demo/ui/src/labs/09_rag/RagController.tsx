import { useState, useEffect, useRef } from 'react';
import { Database, Search, MessageSquare, FileText, Play, Square } from 'lucide-react';

interface QaItem {
    query: string;
    answer: string;
    id: number;
}

export default function RagController() {
    const [isRunning, setIsRunning] = useState(false);
    const [qaList, setQaList] = useState<QaItem[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onmessage = (e) => {
            const line = e.data;
            setLogs(prev => [...prev, line]);

            // Parse Output:
            // ❓ Query: What are the risks?
            // 🤖 Answer: Based on ...

            if (line.includes("Answer:")) {
                const answer = line.split("Answer:")[1].trim();

                // Find matching query in recent logs
                let query = "Context Search...";
                for (let i = logs.length - 1; i >= 0; i--) {
                    if (logs[i].includes("Query:")) {
                        query = logs[i].split("Query:")[1].trim();
                        break;
                    }
                    // Current batch might have it in 'line' if handled differently, but here it's likely previous log
                }
                // Check current batch too (React state update delays might miss it if we strictly look at 'logs')
                // Actually, let's use a simpler heuristic: if we see an Answer, assume the last seen Query is the pair.

                setQaList(prev => {
                    // Dedupe based on answer content to avoid clutter on re-renders/scrolls
                    if (prev.length > 0 && prev[prev.length - 1].answer === answer) return prev;

                    return [...prev, {
                        id: Date.now(),
                        query,
                        answer
                    }];
                });
            }
            // Check if the current line IS the Query, to update our 'last seen' buffer (implicit in logs state)
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
    }, [logs]); // Dependency on logs to allow searching back

    const toggle = async () => {
        const host = window.location.hostname;
        const endpoint = isRunning ? 'stop' : 'start';
        await fetch(`http://${host}:8001/labs/09/${endpoint}`, { method: 'POST' });
        if (!isRunning) {
            setQaList([]); // Clear previous run
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
                        <p className="text-sm text-slate-500">Lab 09: Retrieval Augmented Generation</p>
                    </div>
                </div>

                <button
                    onClick={toggle}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${isRunning
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                        : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/50'}`}
                >
                    {isRunning ? <><Square size={16} fill="currentColor" /> STOP DEMO</> : <><Play size={16} fill="currentColor" /> RUN DEMO</>}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Visual Stream */}
                <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#0a0f1c] to-[#0f1629] space-y-6">
                    {qaList.length === 0 && !isRunning && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                            <Database size={64} className="mb-4" />
                            <p>Run the demo to query the 10-K Knowledge Base...</p>
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
                                <div className="bg-slate-800/50 border border-slate-700 text-slate-200 p-4 rounded-2xl rounded-tl-none shadow-lg">
                                    {item.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef}></div>
                </div>

                {/* Raw Logs Sidebar */}
                <div className="w-80 bg-black border-l border-slate-800 p-4 font-mono text-xs overflow-y-auto hidden lg:block">
                    <div className="text-slate-500 mb-2 font-bold uppercase tracking-wider">Retrieval Logs</div>
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 text-slate-400 break-words opacity-70 border-b border-slate-900/50 pb-1">
                            {log.includes("Indexing") ? <span className="text-yellow-500">{log}</span> : log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
