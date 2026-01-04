import { useRef, useEffect, useState } from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';

export const FlashCell = (params: CustomCellRendererProps) => {
    const { value } = params;
    const prevValueRef = useRef<number | null>(null);
    const [flashClass, setFlashClass] = useState('');

    useEffect(() => {
        if (prevValueRef.current !== null && value !== null && value !== undefined) {
            if (value > prevValueRef.current) {
                setFlashClass('flash-green');
            } else if (value < prevValueRef.current) {
                setFlashClass('flash-red');
            }
        }
        prevValueRef.current = value;

        // Reset flash after animation
        const timer = setTimeout(() => {
            setFlashClass('');
        }, 1000); // 1s matches animation duration

        return () => clearTimeout(timer);
    }, [value]);

    // Format if needed, or just display value
    // We can use params.formattedValue if available, or simpler logic
    const displayValue = params.valueFormatted ? params.valueFormatted : value;

    // Pass custom styles from ColDef if needed (e.g. bold)
    const customStyle = params.colDef?.cellStyle;
    const staticStyle = typeof customStyle === 'function' ? customStyle(params) : customStyle;

    return (
        <div className={`flash-cell ${flashClass}`} style={{ ...staticStyle, width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            {displayValue}
        </div>
    );
};
