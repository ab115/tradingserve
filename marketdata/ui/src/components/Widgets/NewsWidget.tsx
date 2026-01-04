import React, { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { getWsUrl } from '../../config';

interface NewsItem {
    title: string;
    link: string;
    publisher: string;
    providerPublishTime: number;
}

interface Props {
    ticker: string;
}

export const NewsWidget: React.FC<Props> = ({ ticker }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const socketUrl = getWsUrl(`ws/news/${ticker}`);

    const { lastMessage } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectInterval: 5000,
    });

    // Reset news on ticker change
    useEffect(() => {
        setNews([]);
    }, [ticker]);

    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const data = JSON.parse(lastMessage.data) as NewsItem[];
                setNews(data);
            } catch (e) {
                console.error("News parse error", e);
            }
        }
    }, [lastMessage]);

    const safeDate = (timestamp: number) => {
        try {
            if (!timestamp) return "";
            return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    return (
        <div key="news" className="widget news-widget">
            <h3>HEADLINES: {ticker}</h3>
            <div className="news-list">
                {news.length === 0 && <p className="loading">Fetching news...</p>}
                {news.map((item, idx) => (
                    <div key={idx} className="news-item">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-link">
                            <span className="news-time">{safeDate(item.providerPublishTime)}</span>
                            <span className="news-title">{item.title}</span>
                            <span className="news-source"> - {(item.publisher as any)?.displayName || item.publisher || 'Yahoo Finance'}</span>
                        </a>
                    </div>
                ))}
            </div>
            <style>{`
        .news-list { overflow-y: auto; flex: 1; }
        .news-item { padding: 8px 0; border-bottom: 1px solid #333; }
        .news-link { text-decoration: none; color: inherit; display: block; }
        .news-link:hover .news-title { text-decoration: underline; color: #fff; }
        .news-time { color: #ff9800; font-family: 'Roboto Mono', monospace; font-size: 11px; margin-right: 8px; }
        .news-title { color: #e0e0e0; font-size: 13px; font-weight: 500; }
        .news-source { color: #888; font-size: 11px; }
        .loading { font-size: 12px; color: #666; font-style: italic; }
      `}</style>
        </div>
    );
};
