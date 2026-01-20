export const theme = {
    colors: {
        background: '#121212',
        surface: '#1e1e1e',
        surfaceHighlight: '#2c2c2c',
        border: '#333333',
        primary: '#007bff',
        success: '#00ff00', // Bright green for financial positive
        danger: '#ff0000',  // Bright red for financial negative
        text: {
            primary: '#e0e0e0',
            secondary: '#a0a0a0',
            muted: '#666666'
        },
        grid: {
            header: '#1a1a1a',
            rowHover: '#252525',
            flashGreen: 'rgba(0, 255, 0, 0.3)',
            flashRed: 'rgba(255, 0, 0, 0.3)'
        }
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px'
    },
    typography: {
        fontFamily: "'Roboto Mono', monospace", // Financial data standard
        fontSize: {
            xs: '10px',
            sm: '12px',
            md: '14px',
            lg: '16px'
        }
    }
};

export type Theme = typeof theme;
