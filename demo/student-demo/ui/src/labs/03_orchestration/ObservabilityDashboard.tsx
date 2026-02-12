import { ExternalLink } from 'lucide-react';

export default function ObservabilityDashboard() {
    const DASHBOARD_URL = "http://119.235.52.198:3000/";

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0f1c] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                    <ExternalLink size={16} className="text-orange-500" />
                    <span>System Observability (Grafana)</span>
                </div>
                <a
                    href={DASHBOARD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                    Open in New Tab <ExternalLink size={10} />
                </a>
            </div>

            {/* Dashboard Link / Instructions */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-4">
                        <ExternalLink size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200">External Dashboard Access</h3>
                    <p className="text-slate-400">
                        The System Observability Dashboard is hosted on an external Grafana instance.
                        Due to security settings (X-Frame-Options), it cannot be embedded directly here.
                    </p>
                    <a
                        href={DASHBOARD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-orange-900/20"
                    >
                        Open Dashboard in New Tab
                        <ExternalLink size={18} />
                    </a>
                    <p className="text-xs text-slate-600 mt-4">
                        URL: {DASHBOARD_URL}
                    </p>
                </div>
            </div>
        </div>
    );
}
