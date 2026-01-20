import axios from 'axios';

export interface Position {
    ticker: string;
    quantity: number;
    market: string;
    avg_price: number;
    current_price: number;
    pnl: number;
    algo_active?: boolean;
    lastUpdated?: number;
}

export interface PositionUpdate {
    ticker: string;
    quantity_change: number;
    price: number;
}

export const API_URL = '/marketmaker/api';
export const WS_URL = (() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/marketmaker`;
})();

export const getPositions = async (): Promise<Position[]> => {
    const response = await axios.get(`${API_URL}/positions`);
    return response.data;
};

export const updatePosition = async (update: PositionUpdate): Promise<Position> => {
    const response = await axios.post(`${API_URL}/positions/update`, update);
    return response.data;
};

export const addTicker = async (ticker: string): Promise<Position> => {
    const response = await axios.post(`${API_URL}/positions/add`, { ticker });
    return response.data;
};

export const getControlStatus = async (): Promise<{ quoting_enabled: boolean }> => {
    const response = await axios.get(`${API_URL}/control/status`);
    return response.data;
};

export const toggleQuoting = async (enable: boolean): Promise<{ quoting_enabled: boolean }> => {
    const response = await axios.post(`${API_URL}/control/toggle?enable=${enable}`);
    return response.data;
};

export const connectWebSocket = (onMessage: (data: Position[]) => void) => {
    const ws = new WebSocket(`${WS_URL}/ws`);

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (e) {
            console.error("Failed to parse WS message", e);
        }
    };

    ws.onopen = () => console.log('WebSocket Connected');
    ws.onclose = () => console.log('WebSocket Disconnected');
    ws.onerror = (e) => console.error('WebSocket Error', e);

    return ws;
};

// --- Strategy & Tools ---

export const updateStrategyParams = async (params: { gamma?: number; sigma?: number }) => {
    return await axios.post(`${API_URL}/strategy/params`, params);
};

export const switchStrategy = async (strategy: string) => {
    return await axios.post(`${API_URL}/strategy/switch`, { strategy });
};

export const triggerSweep = async () => {
    return await axios.post(`${API_URL}/tools/sweep`);
};
