import { useState, useEffect } from 'react';
import { Play, Square, Terminal } from 'lucide-react';

export default function AlgoController() {
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState("Connected");

    useEffect(() => {
        // Connect to Log WebSocket
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/logs`);

        ws.onopen = () => setLogs(p => [...p, "System: Connected to Log Stream..."]);
        ws.onmessage = (e) => {
            setLogs(prev => [e.data, ...prev].slice(0, 100)); // Keep last 100 lines
        };
        ws.onclose = () => setStatus("Disconnected");

        // Fetch initial status
        fetch(`http://${host}:8001/labs/05/status`)
            .then(res => res.json())
            .then(data => {
                if (data.running) {
                    setIsRunning(true);
                    setLogs(p => ["System: Bot is already running...", ...p]);
                }
            })
            .catch(err => console.error("Failed to fetch process status", err));

        return () => ws.close();
    }, []);

    const toggleBot = async () => {
        const host = window.location.hostname;
        const endpoint = isRunning ? 'stop' : 'start';

        try {
            const res = await fetch(`http://${host}:8001/labs/05/${endpoint}`, { method: 'POST' });
            const data = await res.json();
            if (data.status === 'ok') {
                setIsRunning(!isRunning);
                setLogs(p => [!isRunning ? "System: Starting Bot..." : "System: Stopping Bot...", ...p]);
            } else {
                setLogs(p => [`System Error: ${data.message}`, ...p]);
            }
        } catch (e) {
            console.error(e);
            setLogs(p => [`Connection Error`, ...p]);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Visual Controls */}
            <div className="flex items-center justify-between p-6 bg-slate-900 border border-slate-700 rounded-xl shadow-lg">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Algo Trader Bot</h2>
                    <p className="text-slate-400">Lab 05: Automated Strategy Execution</p>
                </div>

                <button
                    onClick={toggleBot}
                    className={`flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg transition-all ${isRunning
                        ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50'
                        : 'bg-green-500/20 text-green-500 hover:bg-green-500/30 border border-green-500/50'
                        }`}
                >
                    {isRunning ? <><Square fill="currentColor" /> STOP TRADING</> : <><Play fill="currentColor" /> START TRADING</>}
                </button>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 flex flex-col bg-black rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-slate-400 text-sm">
                    <Terminal size={14} />
                    <span>Output Console</span>
                    <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto custom-scrollbar">
                    {logs.length === 0 && <div className="text-slate-600 italic">Ready to run...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-1 break-all ${log.includes("ERROR") ? "text-red-400" :
                            log.includes("BUY") ? "text-blue-400 font-bold" :
                                log.includes("SELL") ? "text-orange-400 font-bold" :
                                    "text-slate-300"
                            }`}>
                            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
