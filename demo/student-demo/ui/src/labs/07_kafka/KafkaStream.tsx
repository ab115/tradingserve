import { useState, useEffect } from 'react';
import { Activity, Terminal } from 'lucide-react';

export default function KafkaStream() {
    const [messages, setMessages] = useState<string[]>([]);
    const [status, setStatus] = useState("Connecting...");

    useEffect(() => {
        const host = window.location.hostname;
        const ws = new WebSocket(`ws://${host}:8001/ws/redpanda`);

        ws.onopen = () => setStatus("Connected ✅");
        ws.onclose = () => setStatus("Disconnected ❌");

        ws.onmessage = (e) => {
            setMessages(prev => [e.data, ...prev].slice(0, 100));
        };

        return () => ws.close();
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#0a0f1c] text-slate-300 font-mono text-xs overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                    <Activity size={16} className="text-orange-500" />
                    <span>Redpanda Stream</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">TOPIC: execution_reports</span>
                    <span className={`text-[10px] ${status.includes("Connected") ? "text-green-400" : "text-red-400"}`}>{status}</span>
                </div>
            </div>

            {/* Stream Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                {messages.length === 0 && (
                    <div className="text-center text-slate-600 italic mt-10">Waiting for messages...</div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className="p-2 rounded bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="break-all">{msg}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
