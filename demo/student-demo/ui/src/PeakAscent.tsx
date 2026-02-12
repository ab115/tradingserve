import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Code, Server, Brain, Shield } from 'lucide-react';

interface Milestone {
    id: number;
    title: string;
    role: string;
    salary: string;
    description: string;
    icon: any;
    color: string;
    x: number; // Percent
    y: number; // Percent (100 is bottom, 0 is top)
}

const MILESTONES: Milestone[] = [
    {
        id: 1,
        title: "Base Camp",
        role: "Junior Developer",
        salary: "$80k - $120k",
        description: "Scripting, Python Basics, Algo Logic",
        icon: Code,
        color: "cyan",
        x: 20,
        y: 85
    },
    {
        id: 2,
        title: "Camp 1",
        role: "Software Engineer",
        salary: "$120k - $160k",
        description: "Docker, CI/CD, Unit Testing",
        icon: Server,
        color: "blue",
        x: 40,
        y: 60
    },
    {
        id: 3,
        title: "Camp 2",
        role: "Senior Engineer",
        salary: "$160k - $220k",
        description: "Microservices, Redis, Event Streaming",
        icon: Shield,
        color: "purple",
        x: 60,
        y: 35
    },
    {
        id: 4,
        title: "The Summit",
        role: "Systems Architect",
        salary: "$220k - $350k+",
        description: "High-Frequency Trading, AI Agents, System Design",
        icon: Brain,
        color: "amber",
        x: 80,
        y: 10
    }
];

export default function PeakAscent() {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <div className="relative w-full h-[600px] bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden p-8 flex flex-col items-center">

            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-8 z-10">
                Your Career Trajectory
            </h2>

            {/* Background Mountain SVG */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <svg viewBox="0 0 1000 600" className="w-full h-full">
                    <path d="M0,600 L300,200 L500,400 L800,50 L1000,600 Z" fill="url(#mtn-gradient)" />
                    <defs>
                        <linearGradient id="mtn-gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.2" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Path and Nodes */}
            <div className="relative w-full max-w-4xl h-full z-10">
                {/* Connecting Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <motion.path
                        d="M200,510 L400,360 L600,210 L800,60"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="4"
                        strokeDasharray="10 10"
                    />
                    {/* Active Path based on selection */}
                    <motion.path
                        d="M200,510 L400,360 L600,210 L800,60"
                        fill="none"
                        stroke="url(#active-gradient)"
                        strokeWidth="4"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: activeStep * 0.33 + 0.1 }}
                        transition={{ duration: 1 }}
                    />
                    <defs>
                        <linearGradient id="active-gradient" x1="0" y1="1" x2="1" y2="0">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                    </defs>
                </svg>

                {MILESTONES.map((m, idx) => (
                    <motion.div
                        key={m.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${m.x}%`, top: `${m.y}%` }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.2 }}
                    >
                        <div
                            className={`relative group cursor-pointer`}
                            onMouseEnter={() => setActiveStep(idx)}
                        >
                            {/* Pulse Effect */}
                            {activeStep === idx && (
                                <div className={`absolute -inset-4 rounded-full bg-${m.color}-500/20 animate-ping`}></div>
                            )}

                            {/* Badge Icon */}
                            <div className={`w-16 h-16 rounded-full bg-slate-900 border-2 flex items-center justify-center transition-all duration-300 ${activeStep >= idx ? `border-${m.color}-500 text-${m.color}-400 shadow-[0_0_20px_rgba(0,0,0,0.5)] shadow-${m.color}-500/30` : 'border-slate-700 text-slate-600'}`}>
                                <m.icon size={28} />
                            </div>

                            {/* Tooltip Card */}
                            <div className={`absolute left-1/2 -translate-x-1/2 mt-4 w-64 p-4 rounded-lg border bg-slate-900/90 backdrop-blur text-center transition-all duration-300 ${activeStep === idx ? `border-${m.color}-500 opacity-100 translate-y-0` : 'border-transparent opacity-0 translate-y-2 pointer-events-none'}`}>
                                <div className={`text-xs font-bold uppercase tracking-widest text-${m.color}-500 mb-1`}>
                                    {m.title}
                                </div>
                                <div className="text-lg font-bold text-white mb-1">
                                    {m.role}
                                </div>
                                <div className="text-sm text-green-400 font-mono mb-2">
                                    {m.salary}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {m.description}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
