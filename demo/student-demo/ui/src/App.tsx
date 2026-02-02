import React, { useState, useEffect, Suspense } from 'react';
import { Code, Database, Activity, Brain, Server, Shield, FileText, Play, Layout, ChevronLeft, ChevronRight } from 'lucide-react';

// --- TYPES ---
type LabId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';

interface LabConfig {
    id: LabId;
    title: string;
    icon: any;
    component: any;
}

// --- COMPONENTS ---

// Generic Code Viewer
const CodeViewer = ({ labId }: { labId: LabId }) => {
    const [code, setCode] = useState("Loading...");
    const [filename, setFilename] = useState("");

    useEffect(() => {
        const host = window.location.hostname;
        fetch(`http://${host}:8001/labs/${labId}/code`)
            .then(res => res.json())
            .then(data => {
                if (data.error) setCode(`Error: ${data.error}`);
                else {
                    setCode(data.code);
                    setFilename(data.filename);
                }
            })
            .catch(err => setCode(`Failed to connect to backend: ${err}`));
    }, [labId]);

    return (
        <div className="flex flex-col h-full bg-[#1e293b] rounded-lg border border-[#334155] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#0f172a] border-b border-[#334155]">
                <span className="text-sm font-mono text-[#94a3b8]">{filename || 'Source Code'}</span>
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                </div>
            </div>
            <pre className="p-4 overflow-auto text-sm font-mono text-[#e2e8f0] leading-relaxed">
                {code}
            </pre>
        </div>
    );
};

// Generic Live Terminal
const LiveTerminal = ({ wsEndpoint, title }: { wsEndpoint: string, title: string }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState("Connecting...");

    useEffect(() => {
        // Dynamically connect to the backend on the same host, port 8001
        const host = window.location.hostname;
        const url = wsEndpoint.replace("localhost", host);
        const ws = new WebSocket(url);
        ws.onopen = () => setStatus("Connected ✅");
        ws.onclose = () => setStatus("Disconnected ❌");
        ws.onmessage = (e) => {
            // Can be JSON or text
            let msg = e.data;
            if (typeof msg !== 'string') msg = JSON.stringify(msg);
            setLogs(prev => [msg, ...prev].slice(0, 50));
        };
        return () => ws.close();
    }, [wsEndpoint]);

    return (
        <div className="flex flex-col h-full bg-black rounded-lg border border-[#334155] font-mono text-sm">
            <div className="px-4 py-2 border-b border-[#334155] flex justify-between text-[#94a3b8]">
                <span>{title}</span>
                <span className={status.includes("Connected") ? "text-green-400" : "text-red-400"}>{status}</span>
            </div>
            <div className="flex-1 p-4 overflow-auto text-green-400 space-y-1">
                {logs.map((L, i) => (
                    <div key={i} className="break-all border-b border-green-900/30 pb-1">{L}</div>
                ))}
                {logs.length === 0 && <div className="opacity-50">Waiting for stream...</div>}
            </div>
        </div>
    );
}

// Lazy load components
const CiCdController = React.lazy(() => import('./labs/01_cicd/CiCdController'));
const AlgoController = React.lazy(() => import('./labs/05_algo/AlgoController'));
const Blotter = React.lazy(() => import('@labs/06_glass/Blotter'));
const AnalystController = React.lazy(() => import('./labs/08_brain/AnalystController'));
const RagController = React.lazy(() => import('./labs/09_rag/RagController'));
const FundController = React.lazy(() => import('./labs/10_fund/FundController'));
const HomeSplash = React.lazy(() => import('./HomeSplash'));
const TraderDesktop = React.lazy(() => import('./TraderDesktop'));

const UnifiedLabView = React.lazy(() => import('./UnifiedLabView'));

// --- MAIN APP ---

function App() {
    const [activeLab, setActiveLab] = useState<LabId | 'HOME'>('HOME');
    const [viewMode, setViewMode] = useState<'CODE' | 'LIVE' | 'GUIDED'>('GUIDED'); // Default to Guided for better UX
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const labs: LabConfig[] = [
        { id: '01', title: 'CI/CD Pipeline', icon: Code, component: () => <CiCdController /> },
        { id: '02', title: 'Docker Container', icon: Server, component: () => <div className="p-10 text-center text-slate-400">Visualization: Build Log Terminal</div> },
        { id: '03', title: 'Observability', icon: Activity, component: () => <div className="p-10 text-center text-slate-400">Running on Grafana Port 3000</div> },
        { id: '04', title: 'Redis Tape', icon: Database, component: () => <LiveTerminal wsEndpoint={`ws://${window.location.hostname}:8001/ws/redis`} title="Redis Monitor (6379)" /> },
        { id: '05', title: 'Algo Trader', icon: Play, component: () => <AlgoController /> },
        { id: '06', title: 'React Blotter', icon: FileText, component: () => <Blotter /> },
        { id: '07', title: 'Audit Log', icon: Shield, component: () => <LiveTerminal wsEndpoint={`ws://${window.location.hostname}:8001/ws/redpanda`} title="Redpanda Stream (19092)" /> },
        { id: '08', title: 'AI Analyst', icon: Brain, component: () => <AnalystController /> },
        { id: '09', title: 'RAG Doc', icon: FileText, component: () => <RagController /> },
        { id: '10', title: 'Fund Manager', icon: Activity, component: () => <FundController /> },
        { id: '11', title: 'Cloud Scaling', icon: Server, component: () => <div className="p-10 text-center text-slate-400">HPA Metrics Chart</div> },
        { id: '12', title: 'Trader Desktop', icon: Layout, component: () => <TraderDesktop /> },
    ];

    const CurrentLab = labs.find(l => l.id === activeLab);

    if (activeLab === 'HOME') {
        return (
            <Suspense fallback={<div className="bg-black h-screen text-white flex items-center justify-center">Loading Market Data...</div>}>
                <HomeSplash onStart={() => setActiveLab('01')} />
            </Suspense>
        );
    }



    return (
        <div className="flex h-screen bg-[#0f172a] text-[#f8fafc] font-sans overflow-hidden">
            {/* SIDEBAR */}
            <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#1e293b]/50 border-r border-[#334155] flex flex-col transition-all duration-300 ease-in-out shrink-0`}>
                <div className="p-6 border-b border-[#334155] cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between" onClick={() => setActiveLab('HOME')}>
                    {isSidebarOpen ? (
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 whitespace-nowrap">
                                FinTech EduLab
                            </h1>
                            <div className="text-xs text-slate-400 mt-1">Student Demo Environment</div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <h1 className="text-xl font-bold text-cyan-400">FE</h1>
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute bottom-4 left-4 z-50 p-2 bg-slate-800 rounded-full border border-slate-700 text-slate-400 hover:text-white hidden"
                >
                    {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className="flex-1 overflow-y-auto py-4 space-y-1 px-2 custom-scrollbar">
                    {labs.map(lab => (
                        <button
                            key={lab.id}
                            onClick={() => {
                                setActiveLab(lab.id);
                                // If we click a lab while in HOME, default to GUIDED
                                if (activeLab === 'HOME') setViewMode('GUIDED');
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all relative group ${activeLab === lab.id
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                } ${!isSidebarOpen && 'justify-center px-2'}`}
                            title={!isSidebarOpen ? lab.title : ''}
                        >
                            <lab.icon size={20} className={activeLab === lab.id ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"} />

                            {isSidebarOpen && <span className="whitespace-nowrap overflow-hidden">{lab.title}</span>}

                            {/* Tooltip for collapsed mode */}
                            {!isSidebarOpen && (
                                <div className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
                                    {lab.title}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Collapse Toggle at Bottom */}
                <div className="p-4 border-t border-[#334155] flex justify-center">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>
            </div>

            {/* MAIN STAGE */}
            <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#0f172a] to-[#0f172a] overflow-hidden">

                {/* CONDITIONAL CONTENT: Guided Mode vs Standard Mode */}
                {viewMode === 'GUIDED' && CurrentLab ? (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* UNIFIED LAB VIEW (Has its own toolbar) */}
                        <Suspense fallback={<div className="bg-black/50 h-full flex items-center justify-center text-cyan-500">Loading Guided Experience...</div>}>
                            <UnifiedLabView
                                labId={activeLab}
                                LabComponent={CurrentLab.component}
                                onClose={() => setViewMode('CODE')}
                            />
                        </Suspense>
                    </div>
                ) : (
                    <>
                        {/* STANDARD HEADER */}
                        <div className="h-16 border-b border-[#334155] flex items-center justify-between px-8 bg-[#0f172a]/80 backdrop-blur shrink-0">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400">LAB {activeLab}</span>
                                {CurrentLab?.title}
                            </h2>

                            {/* TABS */}
                            <div className="flex bg-[#1e293b] p-1 rounded-lg border border-[#334155] gap-1">
                                <button
                                    onClick={() => setViewMode('GUIDED')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${viewMode === 'GUIDED' ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Brain size={14} />
                                    Guided Mode
                                </button>
                                <div className="w-px bg-slate-700 mx-1 my-1"></div>
                                <button
                                    onClick={() => setViewMode('CODE')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'CODE' ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Student Code
                                </button>
                                <button
                                    onClick={() => setViewMode('LIVE')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'LIVE' ? 'bg-[#06b6d4] text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Live Demo
                                </button>
                            </div>
                        </div>

                        {/* STANDARD CONTENT */}
                        <div className="flex-1 p-8 overflow-auto">
                            {viewMode === 'CODE' ? (
                                <CodeViewer labId={activeLab as LabId} />
                            ) : (
                                <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <Suspense fallback={<div className="p-8 text-slate-500">Loading Module...</div>}>
                                        {CurrentLab && <CurrentLab.component />}
                                    </Suspense>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div >
    )
}

export default App
