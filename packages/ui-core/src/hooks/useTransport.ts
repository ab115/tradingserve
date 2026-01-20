import { useEffect, useRef, useState, useCallback } from 'react';

export interface TransportStatus {
    status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    lastError?: string;
}

export interface TransportMessage<T = any> {
    type: string;
    payload: T;
}

export const useTransport = <T = any>(url: string) => {
    const [status, setStatus] = useState<TransportStatus['status']>('DISCONNECTED');
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number>();
    const messageHandlerRef = useRef<((data: T) => void) | null>(null);

    const connect = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        setStatus('CONNECTING');
        try {
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                setStatus('CONNECTED');
                console.log(`[Transport] Connected to ${url}`);
            };

            ws.onclose = () => {
                setStatus('DISCONNECTED');
                console.log(`[Transport] Disconnected from ${url}. Reconnecting...`);
                // Exponential backoff or simple retry could go here
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(connect, 3000) as unknown as number;
            };

            ws.onerror = (err) => {
                console.error(`[Transport] Error:`, err);
                setStatus('ERROR');
                ws.close();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (messageHandlerRef.current) {
                        messageHandlerRef.current(data);
                    }
                } catch (e) {
                    console.error('[Transport] Failed to parse message:', e);
                }
            };
        } catch (e) {
            console.error('[Transport] Connection failed:', e);
            setStatus('ERROR');
        }
    }, [url]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    const send = useCallback((message: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.warn('[Transport] Cannot send, socket not open');
        }
    }, []);

    const subscribe = useCallback((handler: (data: T) => void) => {
        messageHandlerRef.current = handler;
    }, []);

    return {
        status,
        send,
        subscribe
    };
};
