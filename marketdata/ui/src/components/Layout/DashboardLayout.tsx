import React from 'react';
import { WidthProvider, Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    // Define a default layout
    const layout = [
        { i: 'market-us', x: 0, y: 0, w: 6, h: 4 },
        { i: 'market-in', x: 6, y: 0, w: 6, h: 4 },
        { i: 'chart', x: 0, y: 4, w: 8, h: 10 },
        { i: 'news', x: 8, y: 4, w: 4, h: 6 },
        { i: 'sector', x: 8, y: 10, w: 4, h: 4 }
    ];

    return (
        <div className="dashboard-layout">
            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                draggableHandle=".widget-header"
            >
                {children}
            </ResponsiveGridLayout>
        </div>
    );
};
