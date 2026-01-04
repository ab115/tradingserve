import React, { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { getWsUrl } from '../../config';

interface Props {
    ticker: string;
}

export const SectorWidget: React.FC<Props> = ({ ticker }) => {
    const [sectorData, setSectorData] = useState<any>(null);
    const socketUrl = getWsUrl(`ws/sector/${ticker}`);

    const { lastMessage } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
    });

    useEffect(() => {
        setSectorData(null);
    }, [ticker]);

    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const data = JSON.parse(lastMessage.data);
                setSectorData(data);
            } catch (e) {
                console.error("Sector parse error", e);
            }
        }
    }, [lastMessage]);

    return (
        <div key="sector" className="widget sector-widget">
            <h3>PROFILE: {ticker}</h3>
            <div className="sector-content">
                {!sectorData && <p className="loading">Fetching profile...</p>}
                {sectorData && (
                    <div className="profile-data">
                        <div className="row"><span className="label">Sector:</span> <span className="val">{sectorData.sector || 'N/A'}</span></div>
                        <div className="row"><span className="label">Industry:</span> <span className="val">{sectorData.industry || 'N/A'}</span></div>
                        <div className="row"><span className="label">Employees:</span> <span className="val">{sectorData.fullTimeEmployees?.toLocaleString() || 'N/A'}</span></div>
                        <div className="desc">{sectorData.longBusinessSummary ? sectorData.longBusinessSummary.substring(0, 150) + '...' : ''}</div>
                    </div>
                )}
            </div>
            <style>{`
          .sector-content { font-size: 12px; }
          .row { margin-bottom: 6px; display: flex; justify-content: space-between; border-bottom: 1px dotted #333; padding-bottom: 2px;}
          .label { color: #888; }
          .val { color: #fff; font-weight: bold; text-align: right; }
          .desc { margin-top: 12px; line-height: 1.4; color: #aaa; font-style: italic; }
          .loading { color: #666; font-style: italic; }
      `}</style>
        </div>
    );
};
