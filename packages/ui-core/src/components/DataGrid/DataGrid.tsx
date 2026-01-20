import React, { forwardRef } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { theme } from '../../theme';

interface Column<T> {
    label: string;
    key: keyof T | string;
    width?: number | string;
    render?: (row: T) => React.ReactNode;
    align?: 'left' | 'right' | 'center';
}

interface DataGridProps<T> {
    data: T[];
    columns: Column<T>[];
    rowKey?: (item: T) => string;
    height?: number | string;
    headerHeight?: number;
    rowHeight?: number;
}

// Custom Table Components for Virtuoso
const Table = (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <table
        {...props}
        style={{
            ...props.style,
            width: '100%',
            borderCollapse: 'collapse',
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily
        }}
    />
);

const TableRow = (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
        {...props}
        style={{
            ...props.style,
            borderBottom: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface
        }}
    />
);

const TableHead = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
    <thead
        {...props}
        ref={ref}
        style={{
            ...props.style,
            backgroundColor: theme.colors.grid.header,
            position: 'sticky',
            top: 0
        }}
    />
));

const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
    <tbody {...props} ref={ref} />
));

export const DataGrid = <T extends object>({
    data,
    columns,
    height = '100%',
    headerHeight = 40,
}: DataGridProps<T>) => {

    const renderRow = (_index: number, row: T) => {
        return (
            <>
                {columns.map((col, idx) => (
                    <td
                        key={idx}
                        style={{
                            padding: theme.spacing.sm,
                            textAlign: col.align || 'left',
                            fontSize: theme.typography.fontSize.sm,
                            width: col.width
                        }}
                    >
                        {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                ))}
            </>
        );
    };

    return (
        <TableVirtuoso
            style={{ height: height, backgroundColor: theme.colors.background }}
            data={data}
            fixedHeaderContent={() => (
                <tr style={{ height: headerHeight }}>
                    {columns.map((col, idx) => (
                        <th
                            key={idx}
                            style={{
                                textAlign: col.align || 'left',
                                padding: theme.spacing.sm,
                                color: theme.colors.text.secondary,
                                fontWeight: 600,
                                width: col.width,
                                borderBottom: `1px solid ${theme.colors.border}`
                            }}
                        >
                            {col.label}
                        </th>
                    ))}
                </tr>
            )}
            itemContent={renderRow}
            components={{
                Table,
                TableRow,
                TableHead,
                TableBody
            }}
        />
    );
};
