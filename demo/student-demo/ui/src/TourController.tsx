import { useEffect, useRef } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Types corresponding to App.tsx
type LabId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '13' | '14';
type ViewMode = 'CODE' | 'LIVE' | 'GUIDED';

interface TourControllerProps {
    startTriggerRef: React.MutableRefObject<() => void>;
    setActiveLab: (id: LabId | 'HOME') => void;
    setViewMode: (mode: ViewMode) => void;
}

export const TourController = ({ startTriggerRef, setActiveLab, setViewMode }: TourControllerProps) => {

    const driverObj = useRef<any>(null);

    useEffect(() => {
        try {
            if (!driver) {
                console.error("Driver.js not loaded");
                return;
            }

            driverObj.current = driver({
                showProgress: true,
                animate: true,
                steps: [
                    {
                        popover: {
                            title: 'Welcome to FinTech EduLab',
                            description: 'This portable environment simulates a real-world diverse trading infrastructure. Prepare for your role as a Full Stack Engineer.',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '#sidebar-nav',
                        popover: {
                            title: 'Lab Navigation',
                            description: 'Navigate through 14 distinct labs covering DevOps, Cloud, AI, and Financial Engineering.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#sidebar-toggle-btn',
                        popover: {
                            title: 'Minimize Sidebar',
                            description: 'Need more space? You can collapse the sidebar to focus on your work. Watch it slide!',
                            side: "right",
                            onNextClick: () => {
                                const btn = document.getElementById('sidebar-toggle-btn');
                                if (btn) {
                                    btn.click(); // Toggle (likely Close)
                                    setTimeout(() => {
                                        btn.click(); // Toggle back (Open)
                                        setTimeout(() => {
                                            driverObj.current.moveNext();
                                        }, 400);
                                    }, 1000);
                                } else {
                                    driverObj.current.moveNext();
                                }
                            }
                        }
                    },
                    {
                        popover: {
                            title: 'Lab 01: CI/CD',
                            description: 'Let\'s start with the basics. We are navigating you to Lab 01 (CI/CD) in Guided Mode.',
                            onNextClick: () => {
                                setActiveLab('01');
                                setViewMode('GUIDED');
                                document.getElementById('toggle-workspace-btn')?.click();

                                // Small delay to allow render
                                setTimeout(() => {
                                    document.getElementById('toggle-workspace-btn')?.click();
                                    driverObj.current.moveNext();
                                }, 500);
                            }
                        }
                    },
                    {
                        element: '#unified-lab-view',
                        popover: {
                            title: 'Guided Experience',
                            description: 'On the left is your Lab Manual. On the right is your Workspace. Both are visible to help you learn and do simultaneously.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#unified-lab-view',
                        popover: {
                            title: 'Focus Mode: Workspace',
                            description: 'We can toggle the "Lab Manual" off. Notice how the Terminal expands to give you a full-width coding environment.',
                            side: "top",
                            align: 'center',
                            onNextClick: () => {
                                // Restore View (Click again)
                                document.getElementById('toggle-manual-btn')?.click();
                                driverObj.current.moveNext();
                            }
                        },
                        onHighlightStarted: () => {
                            // Simulate Click (Hide Manual)
                            // Small timeout to ensure element is ready if switching views
                            setTimeout(() => {
                                document.getElementById('toggle-manual-btn')?.click();
                            }, 300);
                        }
                    },
                    {
                        element: '#unified-lab-view',
                        popover: {
                            title: 'Focus Mode: Reading',
                            description: 'Or we can hide the "Workspace" to maximize the reading area for deep study.',
                            side: "top",
                            align: 'center',
                            onNextClick: () => {
                                // Restore View (Click again)
                                document.getElementById('toggle-workspace-btn')?.click();
                                driverObj.current.moveNext();
                            }
                        },
                        onHighlightStarted: () => {
                            // Simulate Click (Hide Workspace)
                            setTimeout(() => {
                                document.getElementById('toggle-workspace-btn')?.click();
                            }, 300);
                        }
                    },
                    {
                        popover: {
                            title: 'Advanced Labs',
                            description: 'Now let\'s check out a Backend Lab. Navigating to Redis Monitor...',
                            onNextClick: () => {
                                setActiveLab('04');
                                setViewMode('LIVE');
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 500);
                            }
                        }
                    },
                    {
                        element: '#main-stage',
                        popover: {
                            title: 'Live Visualization',
                            description: 'Some labs, like Redis, provide real-time visualizations of infrastructure components using WebSockets.',
                            side: "top",
                            align: 'center'
                        }
                    },
                    {
                        popover: {
                            title: 'The Finale: Trader Desktop',
                            description: 'Finally, let\'s look at the capstone project. Navigating to Lab 12...',
                            onNextClick: () => {
                                setActiveLab('12');
                                setViewMode('LIVE');
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 800);
                            }
                        }
                    },
                    {
                        element: '#market-panel',
                        popover: {
                            title: 'Market Data',
                            description: 'Real-time Market Data streaming via WebSockets from Redis Pub/Sub channels.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#fund-panel',
                        popover: {
                            title: 'Fund Manager',
                            description: 'Multi-Agent Portfolio System. Watch the "Analyst", "Risk", and "PM" agents collaborate in real-time.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#algo-panel',
                        popover: {
                            title: 'Algo Strategy',
                            description: 'Algorithmic Trading Bot execution. Observe strategy signals and order generation logs directly from the backend container.',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '#analyst-panel',
                        popover: {
                            title: 'AI Analyst',
                            description: 'Generative AI Market Analysis. See LLM-generated sentiment analysis and news interpretation.',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '#blotter-panel',
                        popover: {
                            title: 'Trade Blotter',
                            description: 'High-performance Order Management. Features virtualized grid rendering for handling high-frequency order flow.',
                            side: "top",
                            align: 'center'
                        }
                    },
                    {
                        popover: {
                            title: 'New: The Green Hornet (Lab 13)',
                            description: 'Ready to build? Lab 13 offers 5 "Greenfield" projects where you build systems from scratch. Let\'s check one out.',
                            onNextClick: () => {
                                setActiveLab('13');
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 800);
                            }
                        }
                    },
                    {
                        element: '#gh-project-1',
                        popover: {
                            title: 'Project 1: The Watchtower',
                            description: 'A Distributed Log Aggregator challenge. Click to see the requirements!',
                            onNextClick: () => {
                                document.getElementById('gh-project-1')?.click();
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 500);
                            }
                        }
                    },
                    {
                        element: '#gh-modal-challenge',
                        popover: {
                            title: 'The Challenge',
                            description: 'Each project starts with a real-world problem statement. Here, systems are crashing and logs are lost.',
                            side: "right"
                        }
                    },
                    {
                        element: '#gh-modal-requirements',
                        popover: {
                            title: 'System Requirements',
                            description: 'You are given specific engineering constraints: Ingest, Buffer, Index, and Tail.',
                            side: "left",
                            onNextClick: () => {
                                document.getElementById('gh-modal-close-btn')?.click();
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 500);
                            }
                        }
                    },
                    {
                        popover: {
                            title: 'New: The Brown Bear (Lab 14)',
                            description: 'Now, let\'s pivot to "Brownfield" work using Lab 14.',
                            onNextClick: () => {
                                setActiveLab('14');
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 800);
                            }
                        }
                    },
                    {
                        element: '#legacy-project-sre-leak',
                        popover: {
                            title: 'Bug Hunt: The Leaky Bucket',
                            description: 'This Python UDP Server has a memory leak. It crashes every 10 minutes.',
                            onNextClick: () => {
                                document.getElementById('legacy-project-sre-leak')?.click();
                                setTimeout(() => {
                                    driverObj.current.moveNext();
                                }, 500);
                            }
                        }
                    },
                    {
                        element: '#legacy-code-viewer',
                        popover: {
                            title: 'Code Inspector',
                            description: 'Review the broken code directly in the browser. Identify the bug and fix it!',
                            side: "left"
                        }
                    },
                    {
                        popover: {
                            title: 'Tour Complete',
                            description: 'You are now ready to explore the FinTech EduLab. Good luck!',
                        }
                    }
                ]
            });

            // Expose start function to parent via ref
            startTriggerRef.current = () => {
                driverObj.current.drive();
            };

        } catch (e) {
            console.warn("Driver.js initialization failed:", e);
        }

    }, [setActiveLab, setViewMode, startTriggerRef]);

    return null; // Logic only
};
