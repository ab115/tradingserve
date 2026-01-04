import React, { useEffect, useRef, memo } from 'react';

interface Props {
    symbol: string;
}

export const ChartWidget: React.FC<Props> = memo(({ symbol }) => {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        // Clear previous
        container.current.innerHTML = "";

        // Re-create the widget container div that the script expects
        const widgetDiv = document.createElement("div");
        widgetDiv.className = "tradingview-widget-container__widget";
        widgetDiv.style.height = "calc(100% - 32px)";
        widgetDiv.style.width = "100%";
        container.current.appendChild(widgetDiv);

        let tvSymbol = symbol;
        if (symbol.endsWith('.NS')) {
            // NSE symbols are often restricted in free embed widgets.
            // Fallback to BSE (Bombay Stock Exchange) which is usually allowed.
            tvSymbol = 'BSE:' + symbol.replace('.NS', '');
        } else if (symbol.endsWith('.BO')) {
            tvSymbol = 'BSE:' + symbol.replace('.BO', '');
        } else {
            // For US stocks, let TradingView auto-resolve or use the raw symbol
            // forcing NASDAQ causes errors for NYSE/AMEX stocks like SPY
            tvSymbol = 'NYSE:' + symbol;
        }

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
      {
        "autosize": true,
        "symbol": "${tvSymbol}",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "support_host": "https://www.tradingview.com"
      }`;

        container.current.appendChild(script);
    }, [symbol]);

    return (
        <div className="widget chart-widget" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
                <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
            </div>
        </div>
    );
});
