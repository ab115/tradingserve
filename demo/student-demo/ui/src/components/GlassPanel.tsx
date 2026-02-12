import React from 'react';
import { Maximize2, MoreHorizontal } from 'lucide-react';

interface GlassPanelProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
    onMaximize?: () => void;
}

export default function GlassPanel({ title, icon, children, className = '', action, onMaximize }: GlassPanelProps) {
    return (
        <div className={`flex flex-col h-full bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative group ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border-b border-slate-800/50 select-none shrink-0">
                <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider text-xs uppercase">
                    {icon && <span className="opacity-80">{icon}</span>}
                    {title}
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                    {action}
                    {onMaximize && (
                        <button onClick={onMaximize} className="hover:text-cyan-400 transition-colors" title="Maximize">
                            <Maximize2 size={12} />
                        </button>
                    )}
                    <button className="hover:text-white transition-colors">
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>

            {/* Decorative Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
    );
}
