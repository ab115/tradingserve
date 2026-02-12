import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Activity, Box } from 'lucide-react';
import { motion } from 'framer-motion';

// Types
interface Container {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string; // running, exited
    ports: Record<string, any[]>;
    labels: Record<string, string>;
}

export default function ContainerManager() {
    const [containers, setContainers] = useState<Container[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'FLEET' | 'TOPOLOGY'>('FLEET');
    // const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchContainers = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:8001/api/docker/containers`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setContainers(data);
            }
        } catch (err) {
            console.error("Failed to fetch containers", err);
        } finally {
            setLoading(false);
            // setLastRefresh(new Date());
        }
    };

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    // Group by Docker Compose Project
    const stacks = containers.reduce((acc, container) => {
        const project = container.labels['com.docker.compose.project'] || 'standalone';
        if (!acc[project]) acc[project] = [];
        acc[project].push(container);
        return acc;
    }, {} as Record<string, Container[]>);

    return (
        <div className="h-full w-full flex flex-col bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
                        <Box className="text-cyan-400" />
                        Docker Pulse
                    </h2>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button
                            onClick={() => setView('FLEET')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${view === 'FLEET' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Fleet Command
                        </button>
                        <button
                            onClick={() => setView('TOPOLOGY')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${view === 'TOPOLOGY' ? 'bg-purple-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Compose Topology
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <Activity size={12} className="text-green-400" />
                        Live Stream (3s)
                    </span>
                    <button onClick={fetchContainers} className="hover:text-white transition-colors">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">
                        <Server size={48} className="mb-4" />
                        <p>Scanning Docker Daemon...</p>
                    </div>
                ) : (
                    <>
                        {view === 'FLEET' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {containers.map(c => (
                                    <ContainerCard key={c.id} container={c} />
                                ))}
                            </div>
                        )}

                        {view === 'TOPOLOGY' && (
                            <div className="space-y-8">
                                {Object.entries(stacks).map(([project, stackContainers]) => (
                                    <div key={project} className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                                        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                                            <h3 className="font-mono text-sm font-bold text-purple-300">Stack: {project}</h3>
                                            <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">{stackContainers.length} services</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {stackContainers.map(c => (
                                                <TopologyNode key={c.id} container={c} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Sub-components

function ContainerCard({ container }: { container: Container }) {
    const isRunning = container.state.toLowerCase() === 'running';

    // Parse ports for display
    const portList = Object.entries(container.ports || {}).map(([cPort, hostBindings]) => {
        if (!hostBindings) return cPort;
        return `${hostBindings[0].HostPort} -> ${cPort}`;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border flex flex-col gap-3 relative overflow-hidden ${isRunning ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800 opacity-70'}`}
        >
            {/* Status Indicator */}
            <div className={`absolute top-0 right-0 w-16 h-16 transform translate-x-8 -translate-y-8 rotate-45 ${isRunning ? 'bg-green-500/20' : 'bg-red-500/20'}`}></div>

            <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${isRunning ? 'bg-green-400 shadow-green-400' : 'bg-red-500 shadow-red-500'}`}></div>
                    <div>
                        <h4 className="font-bold text-sm truncate w-40" title={container.name}>{container.name.replace(/^\//, '')}</h4>
                        <div className="text-[10px] text-slate-500 font-mono truncate w-40" title={container.image}>{container.image}</div>
                    </div>
                </div>
            </div>

            {/* Metrics (Simulated for now) */}
            <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-black/30 p-2 rounded border border-slate-700/50">
                    <div className="text-[10px] text-slate-500 mb-1">CPU Usage</div>
                    <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                        <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: isRunning ? `${Math.random() * 20 + 1}%` : '0%' }}></div>
                    </div>
                </div>
                <div className="bg-black/30 p-2 rounded border border-slate-700/50">
                    <div className="text-[10px] text-slate-500 mb-1">MEM Usage</div>
                    <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: isRunning ? `${Math.random() * 40 + 10}%` : '0%' }}></div>
                    </div>
                </div>
            </div>

            {/* Ports */}
            {portList.length > 0 && (
                <div className="mt-auto pt-2 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-1">
                        {portList.map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400 font-mono">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function TopologyNode({ container }: { container: Container }) {
    const isRunning = container.state.toLowerCase() === 'running';

    return (
        <div className={`flex items-center gap-3 p-3 rounded bg-slate-950 border ${isRunning ? 'border-purple-500/30' : 'border-slate-800'}`}>
            <div className={`w-1.5 h-full rounded-full ${isRunning ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate text-purple-200">{container.name.replace(/^\//, '')}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isRunning ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {container.state}
                    </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{container.image}</div>
            </div>
        </div>
    );
}
