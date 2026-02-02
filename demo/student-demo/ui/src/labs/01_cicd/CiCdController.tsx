import React, { useState } from 'react';
import { GitBranch, GitCommit, GitPullRequest, Play, CheckCircle, AlertTriangle, ShieldCheck, Terminal, Server } from 'lucide-react';

interface Module {
    id: number;
    title: string;
    icon: any;
    topics: string[];
    subtext: string;
}

const modules: Module[] = [
    {
        id: 1,
        title: "Git Fundamentals",
        icon: GitCommit,
        topics: [
            "Initialize a local Git repository",
            "Track file changes",
            "Commit changes with proper messages",
            "View commit history"
        ],
        subtext: "Why Git & CI/CD Exist"
    },
    {
        id: 2,
        title: "GitHub Collaboration",
        icon: GitPullRequest,
        topics: [
            "Push local repository to GitHub",
            "Create and review a pull request",
            "Merge using approval rules"
        ],
        subtext: "Team Workflow"
    },
    {
        id: 3,
        title: "Branching & Merging",
        icon: GitBranch,
        topics: [
            "Create feature branches",
            "Merge branches into main",
            "Trigger and resolve merge conflicts"
        ],
        subtext: "Managing Parallel Development"
    },
    {
        id: 4,
        title: "GitHub Actions – CI Basics",
        icon: Play,
        topics: [
            "Create a basic GitHub Actions workflow",
            "Run pipeline on every pull request"
        ],
        subtext: "Automating Workflows"
    },
    {
        id: 5,
        title: "Build & Test Automation",
        icon: CheckCircle,
        topics: [
            "Add test cases",
            "Break code intentionally",
            "Observe pipeline failure and recovery"
        ],
        subtext: "Quality Assurance"
    },
    {
        id: 6,
        title: "Continuous Delivery (CD)",
        icon: Server,
        topics: [
            "Simulate deployment to Dev environment",
            "Manual approval before Production"
        ],
        subtext: "Deployment Strategies"
    }
];

export default function CiCdController() {
    const [activeModule, setActiveModule] = useState<number | null>(null);

    return (
        <div className="h-full bg-[#0a0f1c] text-white p-6 overflow-y-auto">
            <div className="mb-8 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-3">
                    <Terminal className="text-cyan-500" /> CI/CD Pipeline Curriculum
                </h2>
                <p className="text-slate-400 mt-2">Mastering the path from code commit to production deployment.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((m) => (
                    <div
                        key={m.id}
                        className={`
                            border rounded-xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden
                            ${activeModule === m.id ? 'bg-cyan-900/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-[#0f172a] border-slate-800 hover:border-slate-600 hover:bg-[#1e293b]'}
                        `}
                        onClick={() => setActiveModule(activeModule === m.id ? null : m.id)}
                    >
                        {/* Status Indicator (Purely Visual for Demo) */}
                        <div className="absolute top-4 right-4">
                            <div className={`w-2 h-2 rounded-full ${m.id <= 2 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-lg ${activeModule === m.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                                <m.icon size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{m.title}</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">{m.subtext}</p>
                            </div>
                        </div>

                        <div className={`space-y-3 transition-all duration-500 ${activeModule === m.id ? 'opacity-100 max-h-96' : 'opacity-60 max-h-24'}`}>
                            <div className="h-px bg-slate-800 my-3"></div>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {m.topics.map((topic, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-cyan-500/50 mt-1">•</span>
                                        <span>{topic}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {activeModule !== m.id && (
                            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none"></div>
                        )}
                    </div>
                ))}
            </div>

            {/* Simulated Git Graph / Status View at Bottom */}
            <div className="mt-12 p-6 border border-slate-800 rounded-xl bg-[#0f172a]/50">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ActivityIcon /> Pipeline Status Simulation
                </h3>
                <div className="flex items-center justify-between text-xs font-mono">
                    <Stage name="Build" status="success" time="45s" />
                    <Line />
                    <Stage name="Test" status="success" time="1m 20s" />
                    <Line />
                    <Stage name="Docker" status="running" time="2m 10s" />
                    <Line />
                    <Stage name="Deploy: Dev" status="pending" time="--" />
                    <Line />
                    <Stage name="Deploy: Prod" status="blocked" time="--" />
                </div>
            </div>
        </div>
    );
}

const Stage = ({ name, status, time }: { name: string, status: 'success' | 'running' | 'pending' | 'blocked', time: string }) => {
    const color =
        status === 'success' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
            status === 'running' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 animate-pulse' :
                status === 'blocked' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                    'text-slate-500 border-slate-700 bg-slate-800/50';

    return (
        <div className={`flex flex-col items-center gap-2 px-6 py-3 rounded border ${color}`}>
            <span className="font-bold">{name}</span>
            <span className="text-[10px] opacity-70">{status.toUpperCase()} ({time})</span>
        </div>
    )
}

const Line = () => <div className="h-px bg-slate-700 flex-1 mx-2"></div>

const ActivityIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
)
