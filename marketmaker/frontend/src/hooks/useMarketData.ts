import { useEffect } from 'react';
import { useTransport } from '@tradingserver/ui-core';
import { useStore } from '../state';
import { WS_URL, Position } from '../api';

export const useMarketData = () => {
    const { updatePositions, addOrder, addExecution, setConnectionStatus } = useStore();
    const { status, subscribe } = useTransport<any>(`${WS_URL}/ws`);

    useEffect(() => {
        setConnectionStatus(status === 'CONNECTED');
    }, [status, setConnectionStatus]);

    useEffect(() => {
        const unsubscribe = subscribe((data: any) => {
            if (Array.isArray(data)) {
                updatePositions(data);
            } else if (data && data.type === 'EVENT') {
                if (data.subtype === 'ORDER_SENT') {
                    addOrder(data.data);
                } else if (data.subtype === 'EXEC_REPORT') {
                    // Check for Fill (1=Partial, 2=Filled)
                    if (data.data.status === '1' || data.data.status === '2') {
                        addExecution(data.data);
                    }
                }
            } else if (data && data.type === 'STATUS_UPDATE') {
                // Handle status update if needed (e.g. quoting enabled)
            }
        });
        return unsubscribe;
    }, [subscribe, updatePositions, addOrder, addExecution]);

    return { status };
};
