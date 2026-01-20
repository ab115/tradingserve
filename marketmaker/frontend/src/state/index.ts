import { create } from 'zustand';

interface Position {
    ticker: string;
    inventory: number;
    pnl: number;
    buy_orders: number;
    sell_orders: number;
    realized_pnl: number;
    current_price: number;
    avg_price: number;
    market: string;
    algo_active?: boolean;
}

// ... Quote, LiveOrder interfaces ...

interface MarketMakerState {
    positions: Position[];
    orders: LiveOrder[];
    executions: LiveOrder[];
    isConnected: boolean;
    setPositions: (positions: Position[]) => void;
    updatePositions: (updates: Position[]) => void;
    addOrder: (order: LiveOrder) => void;
    addExecution: (execution: LiveOrder) => void;
    setConnectionStatus: (status: boolean) => void;
}

export const useStore = create<MarketMakerState>((set) => ({
    positions: [],
    orders: [],
    executions: [],
    isConnected: false,
    setPositions: (positions) => set({ positions }),
    updatePositions: (updates) => set((state) => {
        const newPositions = [...state.positions];
        updates.forEach(update => {
            const index = newPositions.findIndex(p => p.ticker === update.ticker);
            if (index !== -1) {
                newPositions[index] = { ...newPositions[index], ...update };
            } else {
                newPositions.push(update);
            }
        });
        return { positions: newPositions };
    }),
    addOrder: (order) => set((state) => ({ orders: [order, ...state.orders].slice(0, 50) })),
    addExecution: (exec) => set((state) => ({ executions: [exec, ...state.executions].slice(0, 50) })),
    setConnectionStatus: (status) => set({ isConnected: status })
}));
