import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Terminal, Cpu, Globe, Zap, ArrowRight, CheckCircle,
    PlayCircle, Activity, Server, Database, HelpCircle
} from 'lucide-react';

// --- SUBCOMPONENTS ---

const HeroSection = ({ onStart, onStartTour }: { onStart: () => void, onStartTour: () => void }) => (
    <section className="relative w-full py-20 px-8 flex flex-col items-center justify-center text-center overflow-hidden h-full">
        {/* Abstract BG */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0f172a] to-[#0f172a] animate-spin-slow"></div>
        </div>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="z-10 max-w-4xl flex flex-col items-center justify-center h-full"
        >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                FinTech EduLab V2.0
            </div>

            <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white mb-6">
                Build the Systems <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
                    That Shape Your Future.
                </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Master the complete stack of high-frequency trading.
                From <strong>Microservices</strong> and <strong>Event Streaming</strong> to
                <strong> AI Agents</strong> and <strong>Low-Latency Execution</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={onStartTour}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold text-lg shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2 group"
                >
                    <HelpCircle size={20} />
                    Start Tour
                </button>
                <button
                    onClick={onStart}
                    className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-lg border border-slate-700 transition-all flex items-center justify-center gap-2 group"
                >
                    <PlayCircle size={20} />
                    Start Your Journey
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    </section>
);

const LiveTicker = () => (
    <div className="absolute bottom-0 w-full bg-black/40 border-t border-slate-800 backdrop-blur-sm py-3 px-6 flex flex-wrap justify-between items-center gap-4 text-xs font-mono text-slate-400 z-20">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            LOCAL ENVIRONMENT ACTIVE
        </div>
        <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
                <Server size={12} className="text-blue-400" />
                <span>CONTAINERS: 12</span>
            </span>
            <span className="flex items-center gap-1.5">
                <Activity size={12} className="text-purple-400" />
                <span>THROUGHPUT: 550 MSG/S</span>
            </span>
            <span className="flex items-center gap-1.5">
                <Cpu size={12} className="text-amber-400" />
                <span>AI ANALYST: ONLINE</span>
            </span>
        </div>
    </div>
);

// --- MAIN PAGE ---

export default function HomePage({ onNavigate, onStartTour }: { onNavigate: (id: string) => void, onStartTour: () => void }) {
    return (
        <div className="w-full h-full relative bg-[#0f172a] overflow-hidden flex flex-col">

            <div className="flex-1 flex flex-col justify-center">
                <HeroSection onStart={() => onNavigate('01')} onStartTour={onStartTour} />
            </div>

            <LiveTicker />

            <footer className="absolute bottom-12 w-full text-center text-slate-600 text-xs pointer-events-none">
                <p>&copy; 2026 FinTech EduLab. All Systems Nominal.</p>
            </footer>

        </div>
    );
}
