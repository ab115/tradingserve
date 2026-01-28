import { useState, useEffect } from 'react'
import './App.css'
import { labs } from './labsData'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css' // Highlight.js theme
import axios from 'axios'

// API Base URL (Relative path processing via Nginx is better, but here we assume port 8005 direct or via proxy)
// For the Demo App, the UI is on 3006, Backend on 8005. We need CORS or Proxy.
// The backend main.py allows `*` CORS.
const API_URL = 'http://localhost:8005';

function App() {
    const [activeLabId, setActiveLabId] = useState<number | null>(null);
    const [simRunning, setSimRunning] = useState(false);
    const [loading, setLoading] = useState(false);

    const activeLab = activeLabId !== null ? labs.find(l => l.id === activeLabId) : null;

    // Poll Status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/status`);
                setSimRunning(res.data.simulation_running);
            } catch (e) { console.error("Backend offline", e); }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const toggleSim = async () => {
        setLoading(true);
        try {
            if (simRunning) {
                await axios.post(`${API_URL}/simulation/stop`);
            } else {
                await axios.post(`${API_URL}/simulation/start`);
            }
            // Status update will happen via poll
        } catch (e) {
            alert("Failed to toggle simulation: " + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            {/* UPDATE: TOP BAR */}
            <div className="top-bar">
                <div className="top-logo" onClick={() => setActiveLabId(null)}>FinTech <span>EduLab</span></div>
                <div className="sim-controls">
                    <span className="sim-label">MARKET SIMULATOR:</span>
                    <button
                        className={`sim-btn ${simRunning ? 'stop' : 'start'}`}
                        onClick={toggleSim}
                        disabled={loading}
                    >
                        {loading ? '...' : (simRunning ? '🟥 STOP MARKET' : '▶ START MARKET')}
                    </button>
                    <div className={`status-led ${simRunning ? 'led-green' : 'led-red'}`}></div>
                </div>
            </div>

            <div className="content-wrapper">
                {/* SIDEBAR */}
                <div className="sidebar">
                    <div className="ladder-steps">
                        {labs.map((lab) => (
                            <div
                                key={lab.id}
                                className={`step-btn ${activeLabId === lab.id ? 'active' : ''}`}
                                onClick={() => setActiveLabId(lab.id)}
                            >
                                <div className="step-icon">{lab.icon}</div>
                                <div className="step-info">
                                    <span className="step-role">{lab.role}</span>
                                    <span className="step-title">{lab.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MAIN STAGE */}
                <div className="main-stage">

                    {/* HOME PAGE */}
                    {activeLabId === null && (
                        <div className="home-container animate-in">
                            <h1 className="hero-title">The Engineering Ladder</h1>

                            <div className="timeline">
                                {labs.map((lab, index) => (
                                    <div
                                        key={lab.id}
                                        className="timeline-item"
                                        style={{ animationDelay: `${0.1 + (index * 0.1)}s` }}
                                    >
                                        <div className="t-badge">{lab.icon}</div>
                                        <div className="t-card" onClick={() => setActiveLabId(lab.id)}>
                                            <div className="t-role">{lab.role}</div>
                                            <div className="t-title">{lab.title}</div>
                                            <div className="skill-list-mini">
                                                {lab.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SPLIT SCREEN LAB VIEW */}
                    {activeLab && (
                        <div className="split-view animate-fade-in">
                            <div className="pane-left">
                                <div className="lab-content">
                                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                        {activeLab.md}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            <div className="pane-right">
                                <div className="workspace-header">
                                    <span>WORKSPACE</span>
                                    <span className="file-badge">level{activeLab.id}_solution.py</span>
                                </div>
                                <div className="workspace-placeholder">
                                    <div className="code-icon">💻</div>
                                    <h3>Ready to Code?</h3>
                                    <p>Open your local IDE or Terminal to start this lab.</p>
                                    <pre className="cmd-hint">
                                        {`cd ~/labs
touch level${activeLab.id}.py
# Follow the instructions on the left!`}
                                    </pre>
                                    <div className="sim-hint">
                                        <span className="hint-icon">💡</span>
                                        <span>Remember to start the <b>Market Simulator</b> (top bar) to generate real-time data for your code!</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

export default App
