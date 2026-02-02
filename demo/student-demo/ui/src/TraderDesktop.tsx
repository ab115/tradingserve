import React, { Suspense } from 'react';
import { Layout, Maximize2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const Blotter = React.lazy(() => import('@labs/06_glass/Blotter'));
const AlgoController = React.lazy(() => import('./labs/05_algo/AlgoController'));
const AnalystController = React.lazy(() => import('./labs/08_brain/AnalystController'));
const FundController = React.lazy(() => import('./labs/10_fund/FundController'));
const MarketDataBlotter = React.lazy(() => import('./labs/04_redis/MarketDataBlotter'));

// Shared styles for panels
const panelStyle = "flex flex-col h-full bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden relative";
const headerStyle = "bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400 border-b border-slate-800 flex justify-between select-none";

export default function TraderDesktop() {
    return (
        <div className="flex flex-col h-[1400px] w-full bg-[#0a0f1c] text-white overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-sm">
                    <Layout size={16} /> Pro Trader Desktop
                </div>
                <div className="text-xs text-slate-500">Live Connection: ECN-PRIMARY</div>
            </div>

            {/* Resizable Grid */}
            <div className="flex-1 p-2 overflow-hidden">
                <PanelGroup direction="vertical">

                    {/* Top Workspace (Sidebar + Main) */}
                    <Panel defaultSize={75} minSize={30}>
                        <PanelGroup direction="horizontal">

                            {/* SIDEBAR */}
                            <Panel defaultSize={20} minSize={15} maxSize={40}>
                                <PanelGroup direction="vertical">
                                    {/* Market Data */}
                                    <Panel defaultSize={60} minSize={20} className={panelStyle}>
                                        <Suspense fallback={<div>Loading...</div>}><MarketDataBlotter /></Suspense>
                                    </Panel>

                                    <PanelResizeHandle className="h-2 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors" />

                                    {/* Algo Engine */}
                                    <Panel defaultSize={40} minSize={20} className={panelStyle}>
                                        <div className={headerStyle}>
                                            <span>ALGO ENGINE</span> <Maximize2 size={12} />
                                        </div>
                                        <div className="h-full overflow-hidden relative">
                                            {/* Scale down to fit the potentially small panel */}
                                            <div className="transform scale-[0.8] origin-top-left w-[125%] h-[125%] absolute top-0 left-0">
                                                <Suspense fallback={<div>Loading...</div>}><AlgoController /></Suspense>
                                            </div>
                                        </div>
                                    </Panel>
                                </PanelGroup>
                            </Panel>

                            <PanelResizeHandle className="w-2 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors" />

                            {/* MAIN STAGE */}
                            <Panel defaultSize={80} minSize={30}>
                                <PanelGroup direction="vertical">
                                    {/* AI Analyst */}
                                    <Panel defaultSize={50} minSize={20} className={panelStyle}>
                                        <div className={headerStyle}>
                                            <span>MARKET INTELLIGENCE</span> <Maximize2 size={12} />
                                        </div>
                                        <div className="h-full overflow-hidden relative">
                                            <Suspense fallback={<div>Loading...</div>}><AnalystController /></Suspense>
                                        </div>
                                    </Panel>

                                    <PanelResizeHandle className="h-2 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors" />

                                    {/* Execution Blotter */}
                                    <Panel defaultSize={50} minSize={20} className={panelStyle}>
                                        <div className={headerStyle}>
                                            <span>EXECUTION BLOTTER</span> <Maximize2 size={12} />
                                        </div>
                                        <div className="h-full overflow-auto">
                                            <Suspense fallback={<div>Loading...</div>}><Blotter /></Suspense>
                                        </div>
                                    </Panel>
                                </PanelGroup>
                            </Panel>

                        </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className="h-2 bg-[#0a0f1c] hover:bg-cyan-500/50 transition-colors" />

                    {/* Footer: Fund Flow */}
                    <Panel defaultSize={25} minSize={10} className={panelStyle}>
                        <div className={headerStyle}>
                            <span>INSTITUTIONAL FUND FLOW</span> <Maximize2 size={12} />
                        </div>
                        <div className="h-full relative overflow-hidden">
                            <div className="transform scale-[0.8] origin-top-left w-[125%] h-[125%] absolute top-0 left-0">
                                <Suspense fallback={<div>Loading...</div>}><FundController /></Suspense>
                            </div>
                        </div>
                    </Panel>

                </PanelGroup>
            </div>
        </div>
    );
}
