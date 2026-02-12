import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Server, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Telemetry Type
interface Telemetry {
    volatility: number;
    replicas: number;
    status: string;
    color: string;
    threshold_high: number;
    threshold_mid: number;
}

export default function CloudDashboard() {
    const [data, setData] = useState<Telemetry | null>(null);
    const [history, setHistory] = useState<number[]>(new Array(20).fill(0));
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Connect to Redis Proxy which now broadcasts 'autoscale_metrics'
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/redis`);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (e) => {
            try {
                // The proxy sends JSON directly
                const msg = JSON.parse(e.data);

                // Be careful, this endpoint broadcasts ALL Redis messages
                // We need to filter or ensure the backend structure handles channel differentiation
                // The current backend implementation sends `json.loads(message['data'])`
                // So if the message is the payload from autoscale.py, it will match our shape.
                // We should add a 'type' or check fields.

                if (msg.volatility !== undefined && msg.replicas !== undefined) {
                    setData(msg);
                    setHistory(prev => [...prev.slice(1), msg.volatility]);
                }
            } catch (err) {
                // Ignore non-json or irrelevant messages
            }
        };

        return () => ws.close();
    }, []);

    // Simulated Replicas Visualization
    const replicas = data?.replicas || 1;
    const volatility = data?.volatility || 0;

    return (
        <div className="h-full w-full flex flex-col bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                        <Cloud className="text-blue-400" />
                        Cloud Autoscale Command
                    </h2>
                    <div className={`text-xs px-2 py-1 rounded border ${connected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {connected ? 'Telemetry Link Active' : 'Disconnected'}
                    </div>
                </div>
                <button
                    onClick={() => {
                        const host = window.location.hostname;
                        fetch(`http://${host}:8001/api/stress/trigger`, { method: 'POST' })
                            .catch(err => console.error(err));
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded text-sm font-bold transition-all flex items-center gap-2"
                >
                    <TrendingUp size={16} />
                    Trigger Stress Test
                </button>
            </div>

            <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">

                {/* Metrics Panel */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} /> Market Volatility Monitor
                    </h3>

                    {/* Live Chart (Simple CSS H-Bar or Canvas? Let's do CSS Bars for now) */}
                    <div className="flex-1 flex items-end gap-1 border-b border-slate-700 pb-2 h-40 relative">
                        {/* Threshold Lines */}
                        <div className="absolute top-[20%] left-0 w-full h-px bg-red-500/50 border-t border-dashed border-red-500 z-0"></div>
                        <div className="absolute top-[50%] left-0 w-full h-px bg-orange-500/50 border-t border-dashed border-orange-500 z-0"></div>

                        {history.map((val, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-cyan-500/50 rounded-t transition-all duration-500 relative z-10 hover:bg-cyan-400"
                                style={{ height: `${val}%` }}
                            ></div>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="bg-black/30 p-3 rounded border border-slate-700">
                            <div className="text-xs text-slate-500">Current Load</div>
                            <div className="text-2xl font-mono font-bold text-white">{volatility}%</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded border border-slate-700">
                            <div className="text-xs text-slate-500">Target Replicas</div>
                            <div className="text-2xl font-mono font-bold text-blue-400">{replicas}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded border border-slate-700">
                            <div className="text-xs text-slate-500">Status</div>
                            <div className={`text-sm font-bold mt-1 ${data?.color === 'red' ? 'text-red-400' : data?.color === 'orange' ? 'text-orange-400' : 'text-green-400'}`}>
                                {data?.status || 'WAITING'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Infrastructure Panel */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <Server size={18} /> Active Fleet
                    </h3>

                    <div className="flex-1 bg-black/20 rounded-lg p-4 relative overflow-hidden flex flex-wrap content-start gap-4">
                        <AnimatePresence>
                            {Array.from({ length: replicas }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="w-24 h-24 bg-slate-800 rounded-lg border border-slate-600 flex flex-col items-center justify-center gap-2 shadow-lg"
                                >
                                    <div className="top-0 right-0 w-full flex justify-end p-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    </div>
                                    <Server size={32} className="text-slate-400" />
                                    <span className="text-xs font-mono text-slate-500">bot-{i + 1}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Placeholder for scaling up */}
                        {replicas < 5 && (
                            <div className="w-24 h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center opacity-50">
                                <span className="text-xs text-slate-600">Available</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 text-xs text-slate-500 text-center font-mono bg-slate-950">
                Run Lab 11 Script to generate telemetry data.
            </div>
        </div>
    );
}
