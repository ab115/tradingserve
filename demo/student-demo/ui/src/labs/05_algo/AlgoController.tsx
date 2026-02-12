import { useState, useEffect, useRef } from 'react';
import { Play, Square, Terminal } from 'lucide-react';

export default function AlgoController() {
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState("Connected");

    const bufferRef = useRef<string[]>([]);

    useEffect(() => {
        // Connect to Log WebSocket
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onopen = () => { bufferRef.current.unshift("System: Connected to Log Stream..."); };
        ws.onmessage = (e) => {
            if (!e.data.includes("[Lab 05]")) return;
            bufferRef.current.unshift(e.data);
        };
        ws.onclose = () => setStatus("Disconnected");

        // Flush Buffer Interval (Throttle updates to 10fps)
        const flushInterval = setInterval(() => {
            if (bufferRef.current.length > 0) {
                setLogs(prev => {
                    const newLogs = [...bufferRef.current, ...prev].slice(0, 100);
                    bufferRef.current = [];
                    return newLogs;
                });
            }
        }, 100);

        // Fetch initial status
        fetch(`http://${host}:8001/labs/05/status`)
            .then(res => res.json())
            .then(data => {
                if (data.running) {
                    setIsRunning(true);
                    bufferRef.current.unshift("System: Bot is already running...");
                }
            })
            .catch(err => console.error("Failed to fetch process status", err));

        return () => {
            ws.close();
            clearInterval(flushInterval);
        };
    }, []);

    const toggleBot = async () => {
        const host = window.location.hostname;
        const newState = !isRunning;
        const endpoint = newState ? 'start' : 'stop'; // Corrected logic

        // Optimistic Update
        setIsRunning(newState);
        bufferRef.current.unshift(newState ? "System: Starting Bot..." : "System: Stopping Bot...");

        try {
            const res = await fetch(`http://${host}:8001/labs/05/${endpoint}`, { method: 'POST' });
            const data = await res.json();
            if (data.status !== 'ok') {
                // Revert on error
                setIsRunning(!newState);
                bufferRef.current.unshift(`System Error: ${data.message}`);
            }
        } catch (e) {
            console.error(e);
            setIsRunning(!newState);
            bufferRef.current.unshift(`Connection Error`);
        }
    };

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Visual Controls */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-sm">
                <div>
                    <h2 className="text-base font-bold text-white leading-none">Algo Bot</h2>
                    <p className="text-[10px] text-slate-500 mt-1">Lab 05: Strategy Exec</p>
                </div>

                <button
                    onClick={toggleBot}
                    className={`btn-glass px-4 py-2 text-xs ${isRunning
                        ? 'btn-glass-danger'
                        : 'btn-glass-primary'
                        }`}
                >
                    {isRunning ? <><Square fill="currentColor" size={12} /> STOP</> : <><Play fill="currentColor" size={12} /> START</>}
                </button>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 flex flex-col bg-black rounded-lg border border-slate-800 overflow-hidden shadow-inner">
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-slate-400 text-xs">
                    <Terminal size={12} />
                    <span>Console</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="flex-1 p-2 font-mono text-[10px] leading-tight overflow-y-auto custom-scrollbar">
                    {logs.length === 0 && <div className="text-slate-600 italic">Ready...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-0.5 break-all ${log.includes("ERROR") ? "text-red-400" :
                            log.includes("BUY") ? "text-blue-400 font-bold" :
                                log.includes("SELL") ? "text-orange-400 font-bold" :
                                    "text-slate-300"
                            }`}>
                            <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
