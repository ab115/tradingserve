import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

interface Trade {
    id: string;
    price: number;
    timestamp: string;
}

interface PriceChartProps {
    trades: Trade[];
}

const PriceChart: React.FC<PriceChartProps> = ({ trades }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#121212' }, // Bloomberg BG
                textColor: '#e0e0e0',
            },
            grid: {
                vertLines: { color: '#333333' },
                horzLines: { color: '#333333' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
        });

        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: '#ff9800', // Bloomberg Orange
            topColor: 'rgba(255, 152, 0, 0.4)',
            bottomColor: 'rgba(255, 152, 0, 0.0)',
            lineWidth: 2,
        });

        chartRef.current = chart;
        seriesRef.current = newSeries;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update Data
    useEffect(() => {
        if (!seriesRef.current || trades.length === 0) return;

        // Sort trades by time ascending (oldest first) for the chart
        // The App passes trades as Newest First usually (for the feed), so reverse it.
        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const data = sortedTrades.map(t => {
            const time = Math.floor(new Date(t.timestamp).getTime() / 1000) as any;
            return {
                time: time,
                value: t.price
            };
        }).filter(pt => !Number.isNaN(pt.value) && !Number.isNaN(pt.time) && pt.time > 0); // Filter invalid

        // Lightweight charts requires unique, ascending timestamps.
        // Simple de-duplication:
        const uniqueData = [];
        let lastTime = 0;
        for (const pt of data) {
            if (pt.time > lastTime) {
                uniqueData.push(pt);
                lastTime = pt.time;
            } else {
                // Update the value of the last tick if same second
                if (uniqueData.length > 0) {
                    uniqueData[uniqueData.length - 1].value = pt.value;
                }
            }
        }

        if (uniqueData.length === 0) return;

        try {
            seriesRef.current.setData(uniqueData);
            chartRef.current?.timeScale().fitContent();
        } catch (err) {
            console.error("Chart Error:", err);
        }

    }, [trades]);

    return (
        <div className="w-full h-full" ref={chartContainerRef} />
    );
};

export default PriceChart;
