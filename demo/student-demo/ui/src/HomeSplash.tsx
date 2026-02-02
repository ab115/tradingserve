import { useState, useEffect } from 'react';
import { Play, TrendingUp, Cpu, Server, Shield, Brain, MousePointerClick } from 'lucide-react';

export default function HomeSplash({ onStart }: { onStart: () => void }) {
    const [pnl, setPnl] = useState(132450.50);
    const [marketAction, setMarketAction] = useState("MARKET OPEN");

    // Simulate Live PnL
    useEffect(() => {
        const interval = setInterval(() => {
            setPnl(prev => prev + (Math.random() - 0.45) * 150);
            if (Math.random() > 0.95) {
                setMarketAction(["HIGH VOLATILITY", "ORDER INFLOW", "BREAKOUT DETECTED", "ALGO TRIGGERED"][Math.floor(Math.random() * 4)]);
            }
        }, 80);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center text-white">
            {/* BACKGROUND VIDEO/IMAGE */}
            <div className="absolute inset-0 z-0 bg-black">
                <img
                    src="/assets/bg-hero.png"
                    className="w-full h-full object-cover opacity-60 animate-in fade-in zoom-in-50 duration-1000"
                    alt="Futuristic Trading Floor"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/80 to-transparent"></div>
            </div>

            {/* FLOATING TICKER */}
            <div className="absolute top-0 w-full overflow-hidden py-2 bg-black/50 backdrop-blur-sm z-10 border-b border-cyan-900/30">
                <div className="flex animate-marquee whitespace-nowrap gap-8 text-xs font-mono text-cyan-400">
                    {[...Array(10)].map((_, i) => (
                        <span key={i} className="flex gap-2">
                            <span>AAPL <span className="text-green-400">▲ 154.20</span></span>
                            <span>GOOG <span className="text-red-400">▼ 2,100.50</span></span>
                            <span>TSLA <span className="text-green-400">▲ 245.80</span></span>
                            <span>BTC <span className="text-green-400">▲ 45,200.00</span></span>
                        </span>
                    ))}
                </div>
            </div>

            {/* MAIN HERO CONTENT */}
            <div className="z-10 text-center max-w-5xl px-4 mt-[-50px]">
                <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-900/20 text-cyan-300 text-xs font-bold tracking-widest uppercase animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan]"></span>
                    {marketAction}
                </div>

                <h1 className="text-7xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-500 drop-shadow-2xl">
                    FROM ZERO TO<br />
                    <span className="text-cyan-400">HEDGE FUND HERO</span>
                </h1>

                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                    Master the full-stack technology of Wall Street. <br />
                    From <strong className="text-white">High-Frequency Algos</strong> to <strong className="text-white">Agentic AI</strong>.
                </p>

                {/* LIVE STATS */}
                <div className="flex justify-center gap-8 mb-12">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl min-w-[200px] transform hover:scale-105 transition-all">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Simulated PnL</div>
                        <div className={`text-3xl font-mono font-bold ${pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl min-w-[200px] transform hover:scale-105 transition-all">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Labs</div>
                        <div className="text-3xl font-mono font-bold text-blue-400">
                            11
                        </div>
                    </div>
                </div>

                <button
                    onClick={onStart}
                    className="group relative inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg tracking-wider hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)] hover:shadow-[0_0_60px_-10px_rgba(6,182,212,0.7)] hover:translate-y-[-2px]"
                >
                    START YOUR CAREER
                    <Play fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* FEATURE GRID BOTTOM */}
            <div className="absolute bottom-0 w-full bg-[#0f172a]/90 backdrop-blur border-t border-slate-800 p-8">
                <div className="max-w-7xl mx-auto flex justify-between gap-4 text-slate-400">
                    <Feature icon={Cpu} label="ALGO TRADING" desc="Python & Event Loops" />
                    <Feature icon={Server} label="CLOUD INFRA" desc="Docker & Kubernetes" />
                    <Feature icon={TrendingUp} label="REAL-TIME DATA" desc="Redis & Webinars" />
                    <Feature icon={Brain} label="AGENTIC AI" desc="LLMs & RAG Pipelines" />
                </div>
            </div>
        </div>
    );
}

function Feature({ icon: Icon, label, desc }: any) {
    return (
        <div className="flex items-center gap-4 hover:text-white transition-colors cursor-default group">
            <div className="p-3 bg-slate-800 rounded-lg group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all">
                <Icon size={24} />
            </div>
            <div className="text-left">
                <div className="font-bold text-sm tracking-wide">{label}</div>
                <div className="text-xs text-slate-500 group-hover:text-slate-400">{desc}</div>
            </div>
        </div>
    )
}
