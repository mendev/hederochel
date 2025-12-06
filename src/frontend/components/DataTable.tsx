import React from 'react';

type DataRow = { id: string; [k: string]: any };

interface DataTableProps<T extends DataRow> {
  data: T[];
  hideColumns?: string[]; // columns to hide (e.g. ['id'])
  onSelect?: (id: string) => void; // called when a row is selected
  selectedId?: string | null;
  selectionLabel?: string; // header label for the select column
  className?: string;
}

function DataTable<T extends DataRow>({
  data,
  hideColumns = ['id'],
  onSelect,
  selectedId = null,
  selectionLabel = '',
  className,
}: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return <div>No data available.</div>;
  }

  const allColumns = Object.keys(data[0]);
  const columns = allColumns.filter((c) => !hideColumns.includes(c));

  return (
    <table className={`data-table ${className ?? ''}`}>
      <thead>
        <tr>
          {onSelect && <th>{selectionLabel}</th>}
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            {onSelect && (
              <td>
                <input
                  type="radio"
                  name="selectedRow"
                  checked={selectedId === row.id}
                  onChange={() => onSelect(row.id)}
                  aria-label={`select-${row.id}`}
                />
              </td>
            )}
            {columns.map((col) => (
              <td key={col}>{(row as any)[col]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { DataTable };