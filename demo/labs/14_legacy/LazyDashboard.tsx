import React, { useState, useEffect } from 'react';

// SIMULATION: "The Lazy Pivot"
// JOB TRACK: Frontend Engineer
// BUG: N+1 Waterfall / Unnecessary Re-renders

export default function LazyDashboard() {
    const [ticks, setTicks] = useState<any[]>([]);
    const [dummyState, setDummyState] = useState(0);

    // Simulate WebSocket Feed
    useEffect(() => {
        const interval = setInterval(() => {
            setTicks(prev => [...prev, { id: Date.now(), sym: "AAPL", price: Math.random() * 100 }]);
        }, 100);
        // <--- BUG 1: Fast updates cause massive re-renders of the entire tree
        return () => clearInterval(interval);
    }, []);

    // <--- BUG 2: Setting state in a loop/timer that doesn't need to be state (forces re-render)
    useEffect(() => {
        const i = setInterval(() => setDummyState(d => d + 1), 500);
        return () => clearInterval(i);
    }, []);

    return (
        <div>
            <h1>High Frequency Blotter</h1>
            {/* <--- BUG 3: Rendering the entire list every time w/o keys or memoization */}
            {ticks.map((t, idx) => (
                <Row key={idx} data={t} />
                // using index as key is bad if list changes, but here it's append only so 'ok'ish, 
                // but the main issue is Row is not memoized.
            ))}
        </div>
    );
}

function Row({ data }: any) {
    // <--- BUG 4: N+1 Request Waterfall
    // Component fetches its own metadata on EVERY mount (and every re-render if not careful)
    // Imagine 100 rows = 100 HTTP requests
    const [meta, setMeta] = useState("Loading...");

    useEffect(() => {
        // simulating fetch
        setTimeout(() => setMeta("Tech Co."), 1000);
        console.log("Fetching metadata for", data.sym);
    }); // <--- BUG 5: Missing dependency array! Runs on EVERY RENDER.

    return (
        <div className="row">
            {data.sym} - {data.price.toFixed(2)} - {meta}
        </div>
    );
}
