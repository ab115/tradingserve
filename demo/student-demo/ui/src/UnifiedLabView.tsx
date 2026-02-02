import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { labContent } from './data/labContent';
import { BookOpen, MonitorPlay, X } from 'lucide-react';

interface UnifiedLabViewProps {
    labId: string;
    LabComponent: React.ComponentType;
    onClose: () => void;
}

export default function UnifiedLabView({ labId, LabComponent, onClose }: UnifiedLabViewProps) {
    // Visibility States
    const [workspaceState, setWorkspaceState] = useState<'CLOSED' | 'OPEN'>('CLOSED');
    const [manualState, setManualState] = useState<'CLOSED' | 'OPEN'>('OPEN');

    // Find content
    const content = labContent.find(l => l.id === labId);

    if (!content) return <div className="p-10 text-red-500">Lab Content Not Found for ID: {labId}</div>;

    // Calculate Layout
    const isManualOpen = manualState === 'OPEN';
    const isWorkspaceOpen = workspaceState === 'OPEN';

    // Width Logic
    // 1. Both Open: Manual 40%, Workspace 60%
    // 2. Manual Only: Manual 100%
    // 3. Workspace Only: Workspace 100%
    // 4. Neither: Show empty state? (Or prevent closing both?)

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0f1c] text-white overflow-hidden relative">
            {/* Header Toolbar */}
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-[#0F172A] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-cyan-500/10 text-cyan-400">
                        <content.icon size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-100">{content.title}</h2>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">{content.role}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle Manual Button */}
                    <button
                        onClick={() => setManualState(manualState === 'CLOSED' ? 'OPEN' : 'CLOSED')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-xs font-bold border ${manualState === 'OPEN'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                        title="Toggle Lab Manual"
                    >
                        <BookOpen size={14} />
                        {manualState === 'OPEN' ? 'Hide Manual' : 'Show Manual'}
                    </button>

                    <div className="w-px h-6 bg-slate-800 mx-1"></div>

                    {/* Toggle Workspace Button */}
                    <button
                        onClick={() => setWorkspaceState(workspaceState === 'CLOSED' ? 'OPEN' : 'CLOSED')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-xs font-bold border ${workspaceState === 'OPEN'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                        title="Toggle Interactive Workspace"
                    >
                        <MonitorPlay size={14} />
                        {workspaceState === 'OPEN' ? 'Hide Workspace' : 'Open Workspace'}
                    </button>

                    <div className="w-px h-6 bg-slate-800 mx-2"></div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Close Guided Mode"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex">

                {/* LEFT PANEL: Manual (Markdown) */}
                {isManualOpen && (
                    <div className={`flex flex-col bg-[#0f172a] transition-all duration-300 border-r border-slate-800 
                        ${isWorkspaceOpen ? 'w-[45%]' : 'w-full'}
                    `}>
                        <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs font-mono text-cyan-400 uppercase shrink-0">
                            <div className="flex items-center gap-2">
                                <BookOpen size={14} />
                                <span>Lab Manual</span>
                            </div>
                            <button onClick={() => setManualState('CLOSED')} className="hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="prose prose-invert prose-slate max-w-4xl mx-auto">

                                {/* VIDEO PLAYER */}
                                {content.videoUrl && (
                                    <div className="mb-8 rounded-xl overflow-hidden shadow-2xl border border-slate-700 aspect-video">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${content.videoUrl}`}
                                            title="Lab Video Tutorial"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}

                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 pb-2 border-b border-slate-800" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-cyan-400 mt-8 mb-4 flex items-center gap-2" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-white mt-6 mb-3" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-slate-300 leading-7 mb-4" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 space-y-2 mb-4 text-slate-300" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 space-y-2 mb-4 text-slate-300" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-purple-500 bg-purple-500/5 p-4 rounded-r my-6 italic text-slate-200" {...props} />,
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            return !inline && match ? (
                                                <div className="my-6 rounded-lg overflow-hidden border border-slate-700 shadow-xl">
                                                    <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-500 flex justify-between">
                                                        <span>{match[1]}</span>
                                                    </div>
                                                    <SyntaxHighlighter
                                                        {...props}
                                                        children={String(children).replace(/\n$/, '')}
                                                        style={atomDark}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        customStyle={{ margin: 0, padding: '1.5rem', background: '#020617' }}
                                                    />
                                                </div>
                                            ) : (
                                                <code {...props} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-sm border border-slate-700">
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {content.md}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}

                {/* RIGHT PANEL: Demo (Interactive) */}
                {isWorkspaceOpen && (
                    <div className="flex-1 flex flex-col bg-[#0b1221] animate-in slide-in-from-right duration-300 border-l border-slate-800">
                        <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs font-mono text-purple-400 uppercase shrink-0">
                            <div className="flex items-center gap-2">
                                <MonitorPlay size={14} />
                                <span>Interactive Workspace</span>
                            </div>
                            <button onClick={() => setWorkspaceState('CLOSED')} className="hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="flex-1 overflow-auto relative bg-[#0b1221]">
                            <LabComponent />
                        </div>
                    </div>
                )}

                {/* Empty State if EVERYTHING is Closed */}
                {!isManualOpen && !isWorkspaceOpen && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <div className="p-8 rounded-full bg-slate-900 mb-4">
                            <monitor size={64} className="opacity-20" />
                        </div>
                        <p>Select a panel to view content</p>
                        <div className="flex gap-4 mt-4">
                            <button onClick={() => setManualState('OPEN')} className="text-blue-400 hover:text-blue-300">Open Manual</button>
                            <button onClick={() => setWorkspaceState('OPEN')} className="text-purple-400 hover:text-purple-300">Open Workspace</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
