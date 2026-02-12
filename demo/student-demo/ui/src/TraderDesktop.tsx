import React, { Suspense, useState } from 'react';
import { Layout, Maximize2, X } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const Blotter = React.lazy(() => import('@labs/06_glass/Blotter'));
const AlgoController = React.lazy(() => import('./labs/05_algo/AlgoController'));
const AnalystController = React.lazy(() => import('./labs/08_brain/AnalystController'));
const FundController = React.lazy(() => import('./labs/10_fund/FundController'));
const MarketDataBlotter = React.lazy(() => import('./labs/04_redis/MarketDataBlotter'));

import GlassPanel from './components/GlassPanel';
import PriceChart from './components/PriceChart';

// Shared styles for panels
// const panelStyle = "h-full w-full"; // GlassPanel handles internal styling

export default function TraderDesktop() {
    const [maximizedId, setMaximizedId] = useState<string | null>(null);

    // Map keys to components for the logical overlay
    const renderComponent = (id: string) => {
        switch (id) {
            case 'MARKET': return <MarketDataBlotter />;
            case 'FUND': return <FundController />;
            case 'CHART': return <PriceChart />;
            case 'BLOTTER': return <Blotter />;
            case 'ALGO': return <AlgoController />;
            case 'ANALYST': return <AnalystController />;
            default: return null;
        }
    };

    const renderOverlay = () => {
        if (!maximizedId) return null;
        return (
            <div className="fixed inset-0 z-50 bg-[#0a0f1c]/80 backdrop-blur-sm flex items-center justify-center p-10 animate-in fade-in zoom-in duration-200">
                <div className="w-full h-full relative shadow-2xl rounded-2xl overflow-hidden border border-slate-700">
                    <button
                        onClick={() => setMaximizedId(null)}
                        className="absolute top-4 right-4 z-50 p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                    <Suspense fallback={<div className="p-10 text-white">Loading...</div>}>
                        {renderComponent(maximizedId)}
                    </Suspense>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0f1c] text-white overflow-hidden font-sans relative">
            {/* Overlay */}
            {renderOverlay()}

            {/* Toolbar */}
            <div className="h-10 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="text-cyan-400 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                        <Layout size={14} /> Pro Trader Desktop
                    </div>
                    <div className="h-4 w-px bg-slate-800"></div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="text-green-500 font-bold">● CONNECTED</span>
                        <span>ECN-PRIMARY</span>
                        <span className="opacity-50">|</span>
                        <span>LATENCY: 12ms</span>
                    </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-widest">{new Date().toLocaleDateString()}</div>
            </div>

            {/* Resizable Grid */}
            <div className="flex-1 p-1 overflow-hidden bg-[#05080f]">
                <PanelGroup direction="horizontal">

                    {/* COL 1: MARKET DATA & FUND MANAGER (Left) */}
                    <Panel defaultSize={25} minSize={20} maxSize={40}>
                        <PanelGroup direction="vertical">
                            {/* Top: Market Data */}
                            <Panel defaultSize={50} minSize={20} className="pb-1" id="market-panel">
                                <GlassPanel
                                    title="Market Depth"
                                    icon={<Layout size={12} />}
                                    className="border-r-0 rounded-r-none"
                                    onMaximize={() => setMaximizedId('MARKET')}
                                >
                                    <Suspense fallback={<div className="p-4 text-xs">Loading Market Data...</div>}>
                                        <MarketDataBlotter />
                                    </Suspense>
                                </GlassPanel>
                            </Panel>

                            <PanelResizeHandle className="h-1 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors z-20" />

                            {/* Bottom: Fund Manager */}
                            <Panel defaultSize={50} minSize={20} className="pt-1" id="fund-panel">
                                <GlassPanel
                                    title="Fund Manager"
                                    icon={<Layout size={12} />}
                                    className="border-r-0 rounded-r-none"
                                    onMaximize={() => setMaximizedId('FUND')}
                                >
                                    <div className="h-full w-full overflow-hidden relative">
                                        <Suspense fallback={<div className="p-4 text-xs">Loading Fund...</div>}>
                                            <FundController />
                                        </Suspense>
                                    </div>
                                </GlassPanel>
                            </Panel>
                        </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors z-20" />

                    {/* COL 2: EXECUTION & CHARTS (Center) */}
                    <Panel defaultSize={50} minSize={30}>
                        <PanelGroup direction="vertical">
                            {/* Top: Chart */}
                            <Panel defaultSize={40} minSize={20} className="pb-1">
                                <GlassPanel
                                    title="Technical Analysis"
                                    icon={<Maximize2 size={12} />}
                                    onMaximize={() => setMaximizedId('CHART')}
                                >
                                    <Suspense fallback={<div className="p-4 text-xs">Loading Chart...</div>}>
                                        <PriceChart />
                                    </Suspense>
                                </GlassPanel>
                            </Panel>

                            <PanelResizeHandle className="h-1 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors z-20" />

                            {/* Bottom: Execution Blotter */}
                            <Panel defaultSize={60} minSize={20} className="pt-1" id="blotter-panel">
                                <GlassPanel
                                    title="Execution Blotter"
                                    icon={<Layout size={12} />}
                                    onMaximize={() => setMaximizedId('BLOTTER')}
                                >
                                    <div className="h-full overflow-hidden">
                                        <Suspense fallback={<div className="p-4 text-xs">Loading Blotter...</div>}>
                                            <Blotter />
                                        </Suspense>
                                    </div>
                                </GlassPanel>
                            </Panel>
                        </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors z-20" />

                    {/* COL 3: AI AGENTS (Right) */}
                    <Panel defaultSize={25} minSize={20} maxSize={35}>
                        <PanelGroup direction="vertical">
                            {/* Algo Bot */}
                            <Panel defaultSize={50} minSize={20} className="pb-1 bg-[#0a0f1c] rounded-lg border border-slate-800/50" id="algo-panel">
                                <GlassPanel
                                    title="Algo Strategy"
                                    icon={<Layout size={12} />}
                                    className="border-l-0 rounded-l-none h-full w-full"
                                    onMaximize={() => setMaximizedId('ALGO')}
                                >
                                    <div className="h-full w-full overflow-hidden relative">
                                        <Suspense fallback={<div className="p-4 text-xs">Loading Algo...</div>}>
                                            <AlgoController />
                                        </Suspense>
                                    </div>
                                </GlassPanel>
                            </Panel>

                            <PanelResizeHandle className="h-1 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors z-20" />

                            {/* Analyst */}
                            <Panel defaultSize={50} minSize={20} className="py-1 bg-[#0a0f1c] rounded-lg border border-slate-800/50" id="analyst-panel">
                                <GlassPanel
                                    title="Market Intelligence"
                                    icon={<Layout size={12} />}
                                    className="border-l-0 rounded-l-none h-full w-full"
                                    onMaximize={() => setMaximizedId('ANALYST')}
                                >
                                    <div className="h-full w-full overflow-hidden relative">
                                        <Suspense fallback={<div className="p-4 text-xs">Loading Analyst...</div>}>
                                            <AnalystController />
                                        </Suspense>
                                    </div>
                                </GlassPanel>
                            </Panel>

                        </PanelGroup>
                    </Panel>

                </PanelGroup>
            </div>

            {/* Footer Status */}
            <div className="h-6 bg-black border-t border-slate-800 flex items-center justify-between px-2 text-[10px] text-slate-600 font-mono">
                <div>SYSTEM: READY</div>
                <div className="flex gap-4">
                    <span>RAM: 14%</span>
                    <span>CPU: 3%</span>
                    <span>NET: 450Mbps</span>
                </div>
            </div>
        </div>
    );
}
