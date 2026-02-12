import { useState } from 'react';
import { Bug, Download, Eye, FileCode, CheckCircle, AlertTriangle, Shield, Activity, Database, Server, Layout } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const projects = [
    {
        id: "sre-leak",
        title: "The Leaky Bucket",
        role: "SRE / DevOps",
        lang: "Python",
        icon: AlertTriangle,
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20",
        desc: "A UDP Log Server that crashes every 10 minutes due to memory exhaustion.",
        bugType: "Memory Leak",
        filename: "leaky_bucket.py",
        difficulty: "Medium"
    },
    {
        id: "quant-race",
        title: "The Phantom Trade",
        role: "Quant Developer",
        lang: "Java",
        icon: Activity,
        color: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20",
        desc: "An Order Matching Engine where money disappears due to race conditions.",
        bugType: "Concurrency / Race Condition",
        filename: "PhantomOrderBook.java",
        difficulty: "Hard"
    },
    {
        id: "data-slow",
        title: "The Slow Tape",
        role: "Data Engineer",
        lang: "Python",
        icon: Database,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
        border: "border-blue-400/20",
        desc: "A VWAP Calculator that falls behind real-time due to O(N²) complexity.",
        bugType: "Algorithmic Complexity",
        filename: "slow_vwap.py",
        difficulty: "Medium"
    },
    {
        id: "backend-float",
        title: "The Broken Ledger",
        role: "Backend Engineer",
        lang: "Java",
        icon: Server,
        color: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20",
        desc: "A Banking Ledger that loses pennies due to Floating Point math errors.",
        bugType: "Precision Error",
        filename: "BrokenLedger.java",
        difficulty: "Easy"
    },
    {
        id: "frontend-lag",
        title: "The Lazy Pivot",
        role: "Frontend Engineer",
        lang: "React",
        icon: Layout,
        color: "text-purple-400",
        bg: "bg-purple-400/10",
        border: "border-purple-400/20",
        desc: "A Dashboard that freezes the browser due to N+1 requests and re-renders.",
        bugType: "Performance / Re-renders",
        filename: "LazyDashboard.tsx",
        difficulty: "Hard"
    }
];

export default function LegacyLab() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [code, setCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const activeProject = projects.find(p => p.id === selectedId);

    const loadCode = async (project: any) => {
        setLoading(true);
        setSelectedId(project.id);
        setCode(null);
        try {
            // Lab ID for Legacy is '14'
            // We map '14' -> this folder in backend, but we need to pass the specific filename hint or use sub-IDs?
            // Current backend logic maps '14' -> 'backend/labs/14_legacy'. 
            // BUT backend fetcher expects 1 file per ID. 
            // We need a way to fetch specific files. 
            // Hack: We will use a special query param or just update backend to handle sub-paths?
            // Actually, let's look at `main.py`. It maps ID -> (Folder, Filename).
            // It doesn't support dynamic filenames.
            // WORKAROUND: We will assume we added 5 new route mappings in main.py: 14a, 14b, 14c...
            // OR we fix main.py to allow `?file=` param.

            // For now, let's assume we implement `14a` -> leaky_bucket.py, etc.
            const mapping: any = {
                "sre-leak": "14a",
                "quant-race": "14b",
                "data-slow": "14c",
                "backend-float": "14d",
                "frontend-lag": "14e"
            };

            const res = await fetch(`http://localhost:8001/labs/${mapping[project.id]}/code`);
            const data = await res.json();
            if (data.code) {
                setCode(data.code);
            } else {
                setCode("// Error loading code: " + data.error);
            }
        } catch (e) {
            setCode("// Error connecting to server");
        }
        setLoading(false);
    };

    const downloadCode = (filename: string, content: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="h-full w-full bg-[#0f172a] text-slate-200 overflow-hidden flex flex-col font-sans">

            {/* Header */}
            <div className="p-8 pb-4 shrink-0">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2 flex items-center gap-3">
                    <Bug className="text-amber-400 animate-pulse" size={40} />
                    The Brown Bear
                </h1>
                <p className="text-lg text-slate-400 max-w-3xl">
                    "The Green Hornet" was about creation. <b>The Brown Bear</b> is about the wild reality of existing code.
                    You have inherited broken "Brownfield" projects. Wrestle them into submission.
                </p>
            </div>

            <div className="flex-1 flex overflow-hidden p-8 pt-0 gap-6">

                {/* LIST */}
                <div className="w-1/3 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            id={`legacy-project-${project.id}`}
                            onClick={() => loadCode(project)}
                            className={`
                                relative p-5 rounded-xl border cursor-pointer group transition-all duration-200
                                ${selectedId === project.id
                                    ? `bg-slate-800 border-amber-500 shadow-lg shadow-amber-900/20`
                                    : `${project.border} ${project.bg} hover:bg-opacity-20 hover:border-slate-500`
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded bg-[#0f172a]/50 ${project.color}`}>
                                        <project.icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{project.title}</h3>
                                        <div className="text-xs text-slate-400">{project.role}</div>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded border ${selectedId === project.id ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                                    {project.lang}
                                </span>
                            </div>

                            <p className="text-sm text-slate-300 mb-3 border-l-2 border-slate-700 pl-2">
                                {project.desc}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Bug size={12} /> {project.bugType}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Shield size={12} /> {project.difficulty}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CODE VIEWER */}
                <div id="legacy-code-viewer" className="flex-1 bg-[#0b1221] rounded-xl border border-slate-700 overflow-hidden flex flex-col relative shadow-2xl">
                    {activeProject ? (
                        <>
                            <div className="bg-[#1e293b] p-3 border-b border-slate-700 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <FileCode size={18} className="text-slate-400" />
                                    <span className="font-mono text-sm text-cyan-400">{activeProject.filename}</span>
                                </div>
                                <div className="flex gap-2">
                                    {code && !code.startsWith("//") && (
                                        <button
                                            onClick={() => downloadCode(activeProject.filename, code)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                                        >
                                            <Download size={14} /> Download
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto relative custom-scrollbar bg-[#0b1221]">
                                {loading ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 gap-3">
                                        <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                                        Fetching Broken Code...
                                    </div>
                                ) : (
                                    <SyntaxHighlighter
                                        language={activeProject.lang.toLowerCase() === 'react' ? 'tsx' : activeProject.lang.toLowerCase()}
                                        style={atomDark}
                                        customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.9rem' }}
                                        showLineNumbers={true}
                                    >
                                        {code || "// Select a project to view the damage."}
                                    </SyntaxHighlighter>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                            <div className="p-6 rounded-full bg-slate-900 mb-4 animate-pulse">
                                <Bug size={64} className="opacity-20" />
                            </div>
                            <p className="text-lg">Select a file to start the hunt</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
