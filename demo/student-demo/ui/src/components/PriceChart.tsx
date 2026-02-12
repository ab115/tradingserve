import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

export default function PriceChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0a0f1c' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
        });

        const newSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        // Generate initial data
        const initialData = [];
        let time = Math.floor(Date.now() / 1000) - 3000; // 50 mins ago
        let open = 150.0;

        for (let i = 0; i < 300; i++) {
            const up = Math.random() > 0.5;
            const volatility = Math.random() * 0.5;
            const close = up ? open + volatility : open - volatility;
            const high = Math.max(open, close) + Math.random() * 0.2;
            const low = Math.min(open, close) - Math.random() * 0.2;

            initialData.push({ time, open, high, low, close });

            time += 10; // 10 second candles
            open = close;
        }

        newSeries.setData(initialData);
        chart.timeScale().fitContent();

        chartRef.current = chart;

        // Resize Handler
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);

        // ResizeObserver for container resize
        const resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(chartContainerRef.current);

        // Real-time Simulation
        const interval = setInterval(() => {
            time += 1;
            const up = Math.random() > 0.5;
            const volatility = Math.random() * 0.2;
            const close = up ? open + volatility : open - volatility;
            const high = Math.max(open, close) + Math.random() * 0.1;
            const low = Math.min(open, close) - Math.random() * 0.1;

            newSeries.update({ time: time as any, open, high, low, close });
            open = close;
        }, 1000);

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            clearInterval(interval);
            chart.remove();
        };
    }, []);

    return (
        <div ref={chartContainerRef} className="w-full h-full bg-[#0a0f1c]" />
    );
}
