import { useState, useEffect, useRef } from 'react';
import { User, Shield, Briefcase, Play, Square, CheckCircle, Smartphone } from 'lucide-react';

interface AgentState {
    name: string;
    role: string;
    status: 'IDLE' | 'WORKING' | 'DONE';
    result?: string;
    icon: any;
    color: string;
}

export default function FundController() {
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);


    // Agent States
    const [agents, setAgents] = useState<AgentState[]>([
        { name: "Analyst", role: "Sentiment", status: 'IDLE', icon: User, color: "text-purple-400" },
        { name: "Risk Officer", role: "Volatility", status: 'IDLE', icon: Shield, color: "text-orange-400" },
        { name: "Portfolio Mgr", role: "Execution", status: 'IDLE', icon: Briefcase, color: "text-green-400" }
    ]);

    const latestLogRef = useRef<HTMLDivElement>(null);
    const bufferRef = useRef<string[]>([]);

    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onmessage = (e) => {
            const line = e.data;
            if (!line.includes("[Lab 10]")) return;
            bufferRef.current.unshift(line);
        };

        // Flush Buffer (Throttle to 10fps)
        const flushInterval = setInterval(() => {
            if (bufferRef.current.length > 0) {
                const newLines = [...bufferRef.current];
                // Update Logs
                setLogs(prev => [...newLines, ...prev].slice(0, 100));

                // Update Agents based on new lines
                setAgents(prev => {
                    const next = [...prev];

                    // Process logs chronologically (Oldest -> Newest)
                    // bufferRef is [Newest, ..., Oldest] (due to unshift). So we reverse it.
                    [...newLines].reverse().forEach(line => {
                        // 1. Analyst
                        if (line.includes("[Analyst Agent]")) next[0].status = 'WORKING';
                        if (line.includes("Sentiment Analysis:")) {
                            next[0].status = 'DONE';
                            next[0].result = line.split("Sentiment Analysis:")[1].trim();
                        }

                        // 2. Risk
                        if (line.includes("[Risk Agent]")) next[1].status = 'WORKING';
                        if (line.includes("Risk Assessment:")) {
                            next[1].status = 'DONE';
                            next[1].result = line.split("Risk Assessment:")[1].trim();
                        }

                        // 3. PM
                        if (line.includes("[Portfolio Agent]")) next[2].status = 'WORKING';
                        if (line.includes("FINAL DECISION:")) {
                            next[2].status = 'DONE';
                            next[2].result = line.split("FINAL DECISION:")[1].trim();
                        }
                    });
                    return next;
                });


                bufferRef.current = [];
            }
        }, 100);

        // Polling status
        const checkStatus = () => {
            fetch(`http://${host}:8001/labs/10/status`)
                .then(res => res.json())
                .then(data => setIsRunning(data.running));
        };

        checkStatus();
        const pollInterval = setInterval(checkStatus, 1000);

        return () => {
            ws.close();
            clearInterval(flushInterval);
            clearInterval(pollInterval);
        };
    }, []);

    const toggle = async () => {
        const host = window.location.hostname;
        const newState = !isRunning;
        const endpoint = newState ? 'start' : 'stop';

        // Optimistic
        setIsRunning(newState);
        if (newState) {
            setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE', result: undefined })));
            setLogs([]);
        }

        try {
            const res = await fetch(`http://${host}:8001/labs/10/${endpoint}`, { method: 'POST' });
            const data = await res.json();
            if (data.status !== 'ok') setIsRunning(!newState); // Revert
        } catch (error) {
            console.error("Failed to toggle fund manager:", error);
            setIsRunning(!newState); // Revert
        }
    };



    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-lg rounded-lg overflow-hidden border border-slate-800">
            {/* Header */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/10 p-2 rounded-md text-indigo-400">
                        <Smartphone size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white tracking-tight leading-none">Fund AI</h1>
                        <p className="text-[10px] text-slate-500 mt-0.5">Lab 10: Multi-Agent</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${showLogs ? 'text-indigo-400' : 'text-slate-500'}`}
                        title="Toggle Agent Logs"
                    >
                        <Square size={14} className={showLogs ? "fill-current" : ""} />
                    </button>
                    <button
                        onClick={toggle}
                        className={`btn-glass px-4 py-1.5 text-xs ${isRunning
                            ? 'btn-glass-danger'
                            : 'btn-glass-primary'}`}
                    >
                        {isRunning ? <><Square size={12} fill="currentColor" /> STOP</> : <><Play size={12} fill="currentColor" /> DEPLOY</>}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Agent Graph View - Responsive */}
                <div className="flex-1 p-4 bg-gradient-to-br from-[#0a0f1c] to-[#0f1629] flex items-center justify-center relative overflow-hidden">

                    {/* Connecting Lines (Scaled) */}
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -z-10 transform -translate-y-1/2"></div>

                    {/* Nodes - Flexible Container */}
                    <div className="flex justify-between w-full max-w-4xl px-4 z-10 gap-2">
                        {agents.map((agent, i) => {
                            const isActive = agent.status !== 'IDLE';
                            const isDone = agent.status === 'DONE';

                            return (
                                <div key={i} className={`flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'opacity-100 scale-105' : 'opacity-60 scale-95'} flex-1 min-w-0`}>
                                    {/* Circle */}
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center bg-[#0a0f1c] shadow-xl relative shrink-0
                                        ${isDone ? `border-${agent.color.split('-')[1]}-500 shadow-${agent.color.split('-')[1]}-500/50` : isActive ? 'border-white animate-pulse' : 'border-slate-700'}`}>

                                        <agent.icon size={20} className={isActive ? agent.color : 'text-slate-600'} />

                                        {isDone && <div className="absolute -top-1 -right-1 bg-green-500 text-black rounded-full p-0.5"><CheckCircle size={10} /></div>}
                                    </div>

                                    {/* Labels */}
                                    <div className="text-center w-full">
                                        <h3 className={`font-bold text-[10px] md:text-xs truncate px-1 ${isActive ? 'text-white' : 'text-slate-600'}`}>{agent.name}</h3>
                                        <p className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-500 truncate">{agent.role}</p>
                                    </div>

                                    {/* Result Bubble */}
                                    <div className={`mt-1 px-2 py-1 rounded border font-mono font-bold text-[9px] transition-all duration-500 transform w-full text-center truncate
                                        ${isDone ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
                                        ${agent.result?.includes("BUY") || agent.result === "BULLISH" || agent.result === "LOW" ? 'bg-green-500/20 border-green-500 text-green-400' :
                                            agent.result === "HOLD" ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                        {agent.result?.substring(0, 20) || "Processing..."}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Raw Logs Sidebar - Toggleable Overlay */}
                {showLogs && (
                    <div className="absolute top-0 right-0 h-full w-48 bg-black/95 backdrop-blur-sm border-l border-slate-800 p-2 font-mono text-[10px] overflow-y-auto animate-in slide-in-from-right duration-200 z-10 shadow-2xl">
                        <div className="text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px] flex justify-between items-center sticky top-0 bg-black/95 pb-1 border-b border-slate-800/50">
                            <span>Agent Logs</span>
                            <button onClick={() => setShowLogs(false)} className="hover:text-white"><Square size={10} /></button>
                        </div>
                        {logs.map((log, i) => (
                            <div key={i} className="mb-0.5 text-slate-400 break-words opacity-70 border-b border-slate-900/50 pb-0.5 leading-tight pl-1">
                                {log.includes("[") ? <span className="text-indigo-400 font-bold">{log}</span> : log}
                            </div>
                        ))}
                        <div ref={latestLogRef}></div>
                    </div>
                )}
            </div>
        </div>
    );
}
