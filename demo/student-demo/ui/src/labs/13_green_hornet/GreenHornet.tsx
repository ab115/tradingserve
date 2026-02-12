import React, { useState } from 'react';
import { Terminal, Database, Cpu, Activity, Server, Brain, ChevronRight, X, Play, Check, Code, Rocket } from 'lucide-react';

// --- DATA ---
const projects = [
    {
        id: 1,
        title: "The Watchtower",
        track: "SRE / DevOps",
        icon: Activity,
        color: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20",
        desc: "Build a centralized Log Aggregator that survives crashes.",
        details: {
            challenge: "A distributed system produces logs across 10 containers. SSH-ing into each one is impossible. You need a centralized Log Aggregator that survives crashes.",
            input: `// POST /logs
{
  "timestamp": "2023-10-27T10:00:00Z",
  "level": "ERROR",
  "service": "payment-gateway",
  "msg": "Connection timeout to bank API",
  "trace_id": "abc-123"
}`,
            requirements: [
                "Ingest: Accept high-velocity logs via HTTP.",
                "Buffer: Queue logs in memory or Redis to prevent data loss.",
                "Index: Store logs in a file structure: /var/logs/{service}/{date}.log.",
                "Tail: Provide a CLI tool or API to 'tail' logs."
            ],
            verification: [
                "The Spike: Send 10,000 logs in 5 seconds. Ensure 0 are dropped.",
                "The Crash: Kill your Aggregator process while sending logs. Restart it."
            ]
        }
    },
    {
        id: 2,
        title: "The Pipeline",
        track: "Data Engineer",
        icon: Database,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
        border: "border-blue-400/20",
        desc: "Build a real-time ETL pipeline to clean dirty market data.",
        details: {
            challenge: "Raw market data is 'Dirty' (missing fields, wrong formats, duplicates). Downstream analytics need 'Clean' data. Build a real-time ETL pipeline.",
            input: `{"sym": "AAPL", "p": 150.5, "t": 1698422400}      // Good
{"sym": "GOOG", "p": -42.0, "t": 1698422401}      // Bad Price
{"sym": "MSFT", "p": "200.0", "t": null}          // Bad Type`,
            requirements: [
                "Extract: Listen to the raw input stream.",
                "Transform: Standardize keys, drop bad records, fill missing timestamps.",
                "Load: Save clean records to Redis."
            ],
            verification: [
                "Schema Check: Ensure ONLY valid fields exist in the output.",
                "Aggregation: Calculate the 1-minute Moving Average for AAPL."
            ]
        }
    },
    {
        id: 3,
        title: "The Matcher",
        track: "Quant Developer",
        icon: Cpu,
        color: "text-purple-400",
        bg: "bg-purple-400/10",
        border: "border-purple-400/20",
        desc: "Build a high-performance Limit Order Book matching engine.",
        details: {
            challenge: "The heart of any exchange is the Order Book. Build a simplified Matching Engine that processes Buy/Sell orders.",
            input: `# ID, Side, Price, Qty
1, BUY, 100.00, 10
2, SELL, 101.00, 5
3, SELL, 99.00, 5`,
            requirements: [
                "Limit Order Book: Maintain a sorted structure of Bids and Asks.",
                "Matching Logic: Automatically match incoming Sell orders against best Buys.",
                "Execution: Emit 'Trade' events when a match occurs."
            ],
            verification: [
                "Price-Time Priority: Submit 2 Buy orders at the same price. First one fills first.",
                "Partial Fill: Submit large Buy, match against multiple small Sells."
            ]
        }
    },
    {
        id: 4,
        title: "The Traffic Cop",
        track: "Cloud Architect",
        icon: Server,
        color: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20",
        desc: "Build a Layer 7 Load Balancer for zero-downtime deployments.",
        details: {
            challenge: "You have 3 instances of a Web Server. You need a single entry point that distributes traffic evenly.",
            input: `curl -v http://localhost:8080/api/v1/status`,
            requirements: [
                "Reverse Proxy: Accept connections on Port 80.",
                "Strategy: Forward traffic using Round Robin.",
                "Health Checks: Periodically 'Ping' upstreams. Stop sending if dead.",
                "Zero Downtime: Hot-add new nodes."
            ],
            verification: [
                "Health Check: Kill server on 9002. LB should skip it.",
                "Concurrency: Fire 100 requests. Distribution should be ~33/33/33."
            ]
        }
    },
    {
        id: 5,
        title: "The Analyst",
        track: "AI Engineer",
        icon: Brain,
        color: "text-cyan-400",
        bg: "bg-cyan-400/10",
        border: "border-cyan-400/20",
        desc: "Build a Semantic Search Engine for financial news using Vectors.",
        details: {
            challenge: "Financial news moves markets. Build a Sentiment Analysis Engine that understands context, not just keywords.",
            input: `User Query: "What is happening with inflation?"`,
            requirements: [
                "Embed: Turn text into Vectors (using embeddings API).",
                "Store: Keep vectors in memory or Vector DB.",
                "Search: Find nearest neighbor (Cosine Similarity)."
            ],
            verification: [
                "Synonyms: Query 'Crude' should match 'Oil'.",
                "Context: Query 'Tech gadget' should match 'iPhone'."
            ]
        }
    }
];

export default function GreenHornet() {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const activeProject = projects.find(p => p.id === selectedId);

    return (
        <div className="h-full w-full bg-[#0f172a] text-slate-200 overflow-y-auto p-8 font-sans custom-scrollbar">

            <div className="max-w-6xl mx-auto">
                {/* HEADLINE */}
                <div className="mb-12 text-center animate-in slide-in-from-top-4 duration-700">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500 mb-4 flex items-center justify-center gap-3">
                        <Rocket className="text-green-400 animate-pulse" size={40} />
                        The Green Hornet
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Your Mission: Build these 5 Greenfield Projects from scratch.
                        Choose your language. Design your system. Prove your engineering worth.
                    </p>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, idx) => (
                        <div
                            key={project.id}
                            id={`gh-project-${project.id}`}
                            onClick={() => setSelectedId(project.id)}
                            className={`
                                relative p-6 rounded-xl border transition-all duration-300 cursor-pointer group
                                ${project.border} ${project.bg} hover:bg-opacity-20 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10
                                animate-in fade-in zoom-in duration-500 delay-${idx * 100}
                            `}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg bg-[#0f172a]/50 ${project.color} group-hover:scale-110 transition-transform`}>
                                    <project.icon size={24} />
                                </div>
                                <span className="text-xs font-mono px-2 py-1 rounded bg-[#0f172a]/50 text-slate-400 border border-slate-700">
                                    LVL {project.id}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">{project.title}</h3>
                            <div className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">{project.track}</div>
                            <p className="text-sm text-slate-300 leading-relaxed mb-6 border-l-2 border-slate-700 pl-3">
                                {project.desc}
                            </p>

                            <div className="absolute bottom-6 right-6 flex items-center text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                View Brief <ChevronRight size={16} className="ml-1" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* MODAL */}
                {selectedId && activeProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div
                            className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-green-900/20 animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >

                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-[#0f172a]">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg bg-slate-800 ${activeProject.color}`}>
                                        <activeProject.icon size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{activeProject.title}</h2>
                                        <div className="text-sm text-slate-400 font-mono flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            {activeProject.track}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar bg-slate-900/50">

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                        <Terminal size={18} className="text-cyan-400" />
                                        The Challenge
                                    </h3>
                                    <p id="gh-modal-challenge" className="text-slate-300 leading-relaxed bg-[#0f172a] p-6 rounded-lg border border-slate-800 shadow-inner text-lg">
                                        {activeProject.details.challenge}
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                        <Code size={18} className="text-yellow-400" />
                                        Sample Input
                                    </h3>
                                    <div className="relative group">
                                        <div className="absolute top-3 right-3 flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                                        </div>
                                        <pre className="bg-[#0a0a0a] p-6 rounded-lg border border-slate-800 font-mono text-sm text-green-400 overflow-x-auto shadow-lg">
                                            {activeProject.details.input}
                                        </pre>
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section className="bg-[#0f172a] p-6 rounded-xl border border-slate-800/50">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <Server size={18} className="text-purple-400" />
                                            System Requirements
                                        </h3>
                                        <ul id="gh-modal-requirements" className="space-y-3">
                                            {activeProject.details.requirements.map((req, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                                    <span className="leading-snug">{req}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section className="bg-[#0f172a] p-6 rounded-xl border border-slate-800/50">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <Check size={18} className="text-green-400" />
                                            Verification
                                        </h3>
                                        <ul className="space-y-3">
                                            {activeProject.details.verification.map((v, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                    <span className="leading-snug">{v}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-700 bg-[#0f172a] flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedId(null)}
                                    id="gh-modal-close-btn"
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors border border-slate-700"
                                >
                                    Close
                                </button>
                                <button
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2"
                                    onClick={() => window.open('https://github.com/new', '_blank')}
                                >
                                    <Rocket size={18} />
                                    Start Project
                                </button>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
