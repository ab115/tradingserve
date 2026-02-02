import { useState, useEffect, useRef } from 'react';
import { User, Shield, Briefcase, ArrowRight, Play, Square, CheckCircle, Smartphone } from 'lucide-react';

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

    // Agent States
    const [agents, setAgents] = useState<AgentState[]>([
        { name: "Analyst", role: "Sentiment", status: 'IDLE', icon: User, color: "text-purple-400" },
        { name: "Risk Officer", role: "Volatility", status: 'IDLE', icon: Shield, color: "text-orange-400" },
        { name: "Portfolio Mgr", role: "Execution", status: 'IDLE', icon: Briefcase, color: "text-green-400" }
    ]);

    const latestLogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onmessage = (e) => {
            const line = e.data;
            setLogs(prev => [...prev, line]);

            // Simple State Machine Parser
            setAgents(prev => {
                const next = [...prev];

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

                return next;
            });
        };

        // Polling status
        const checkStatus = () => {
            fetch(`http://${host}:8001/labs/10/status`)
                .then(res => res.json())
                .then(data => setIsRunning(data.running));
        };

        checkStatus();
        const interval = setInterval(checkStatus, 1000);

        return () => {
            ws.close();
            clearInterval(interval);
        };
    }, []);

    const toggle = async () => {
        const host = window.location.hostname;
        const endpoint = isRunning ? 'stop' : 'start';

        // Reset state on start
        if (!isRunning) {
            setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE', result: undefined })));
            setLogs([]);
        }

        try {
            const res = await fetch(`http://${host}:8001/labs/10/${endpoint}`, { method: 'POST' });
            const data = await res.json();

            if (data.status === 'ok') {
                setIsRunning(!isRunning);
            }
        } catch (error) {
            console.error("Failed to toggle fund manager:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans shadow-2xl rounded-xl overflow-hidden border border-slate-800">
            {/* Header */}
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/10 p-3 rounded-lg text-indigo-400">
                        <Smartphone size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Fund Manager AI</h1>
                        <p className="text-sm text-slate-500">Lab 10: Multi-Agent Workflow</p>
                    </div>
                </div>

                <button
                    onClick={toggle}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${isRunning
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                        : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/50'}`}
                >
                    {isRunning ? <><Square size={16} fill="currentColor" /> STOP AGENTS</> : <><Play size={16} fill="currentColor" /> DEPLOY POD</>}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Agent Graph View */}
                <div className="flex-1 p-12 bg-gradient-to-br from-[#0a0f1c] to-[#0f1629] flex items-center justify-center relative">

                    {/* Connecting Lines */}
                    <div className="absolute top-1/2 left-20 right-20 h-1 bg-slate-800 -z-10 transform -translate-y-1/2"></div>

                    {/* Nodes */}
                    <div className="flex justify-between w-full max-w-4xl z-10">
                        {agents.map((agent, i) => {
                            const isActive = agent.status !== 'IDLE';
                            const isDone = agent.status === 'DONE';

                            return (
                                <div key={i} className={`flex flex-col items-center gap-4 transition-all duration-500 ${isActive ? 'opacity-100 scale-105' : 'opacity-40 scale-100'}`}>
                                    {/* Circle */}
                                    <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center bg-[#0a0f1c] shadow-2xl relative
                                        ${isDone ? `border-${agent.color.split('-')[1]}-500 shadow-${agent.color.split('-')[1]}-500/50` : isActive ? 'border-white animate-pulse' : 'border-slate-700'}`}>

                                        <agent.icon size={32} className={isActive ? agent.color : 'text-slate-600'} />

                                        {isDone && <div className="absolute -top-2 -right-2 bg-green-500 text-black rounded-full p-1"><CheckCircle size={16} /></div>}
                                    </div>

                                    {/* Labels */}
                                    <div className="text-center">
                                        <h3 className={`font-bold text-lg ${isActive ? 'text-white' : 'text-slate-600'}`}>{agent.name}</h3>
                                        <p className="text-xs uppercase tracking-wider text-slate-500">{agent.role}</p>
                                    </div>

                                    {/* Result Bubble */}
                                    <div className={`mt-2 px-4 py-2 rounded-lg border font-mono font-bold transition-all duration-500 transform
                                        ${isDone ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                                        ${agent.result?.includes("BUY") || agent.result === "BULLISH" || agent.result === "LOW" ? 'bg-green-500/20 border-green-500 text-green-400' :
                                            agent.result === "HOLD" ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                        {agent.result}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Raw Logs Sidebar */}
                <div className="w-80 bg-black border-l border-slate-800 p-4 font-mono text-xs overflow-y-auto hidden lg:block">
                    <div className="text-slate-500 mb-2 font-bold uppercase tracking-wider">Agent Logs</div>
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 text-slate-400 break-words opacity-70 border-b border-slate-900/50 pb-1">
                            {log.includes("[") ? <span className="text-indigo-400 font-bold">{log}</span> : log}
                        </div>
                    ))}
                    <div ref={latestLogRef}></div>
                </div>
            </div>
        </div>
    );
}
