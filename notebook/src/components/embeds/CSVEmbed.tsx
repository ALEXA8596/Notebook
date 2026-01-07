import React, { useState, useEffect, useMemo } from 'react';
import 'react-data-grid/lib/styles.css';
import { DataGrid, SelectColumn } from 'react-data-grid';
import type { RenderEditCellProps } from 'react-data-grid';
import { Plus, Minus, Download, Upload, Trash2 } from 'lucide-react';

interface CSVEmbedProps {
  dataString: string;
  onChange: (newData: string) => void;
}

interface Row {
  _id: number;
  [key: string]: string | number;
}

// Custom text editor for cells
function TextEditor({ row, column, onRowChange, onClose }: RenderEditCellProps<Row>) {
  return (
    <input
      className="w-full h-full px-2 border-2 border-blue-500 outline-none bg-white dark:bg-gray-800"
      autoFocus
      value={row[column.key] as string}
      onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
      onBlur={() => onClose(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClose(true);
        if (e.key === 'Escape') onClose(false);
      }}
    />
  );
}

let rowIdCounter = 0;
const getNextRowId = () => ++rowIdCounter;

// Parse CSV string to rows and headers
const parseCSV = (csv: string): { headers: string[]; rows: Row[] } => {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) {
    return { headers: ['A', 'B', 'C'], rows: [] };
  }

  // Simple CSV parsing (handles basic cases, not escaped quotes)
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseLine(lines[i]);
      const row: Row = { _id: getNextRowId() };
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
};

// Convert rows back to CSV string
const toCSV = (headers: string[], rows: Row[]): string => {
  const escapeField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const headerLine = headers.map(escapeField).join(',');
  const dataLines = rows.map(row => 
    headers.map(h => escapeField(String(row[h] || ''))).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
};

export const CSVEmbed: React.FC<CSVEmbedProps> = ({ dataString, onChange }) => {
  const [headers, setHeaders] = useState<string[]>(['A', 'B', 'C']);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());

  // Parse CSV on mount
  useEffect(() => {
    if (dataString) {
      const { headers: h, rows: r } = parseCSV(dataString);
      setHeaders(h);
      setRows(r);
    }
  }, []);

  const columns = useMemo(() => {
    return [
      SelectColumn,
      ...headers.map(header => ({
        key: header,
        name: header,
        editable: true,
        resizable: true,
        width: 150,
        renderEditCell: TextEditor,
      }))
    ];
  }, [headers]);

  const isMounted = React.useRef(false);
  const onChangeRef = React.useRef(onChange);
  
  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isMounted.current) {
      onChangeRef.current(toCSV(headers, rows));
    } else {
      isMounted.current = true;
    }
  }, [rows, headers]);

  const onRowsChange = (newRows: Row[]) => {
    setRows(newRows);
  };

  const addRow = () => {
    const newRow: Row = { _id: getNextRowId() };
    headers.forEach(h => { newRow[h] = ''; });
    setRows([...rows, newRow]);
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    const newRows = rows.filter(row => !selectedRows.has(row._id));
    setRows(newRows);
    setSelectedRows(new Set());
  };

  const addColumn = () => {
    const newHeader = `Column ${headers.length + 1}`;
    setHeaders([...headers, newHeader]);
    setRows(rows.map(row => ({ ...row, [newHeader]: '' })));
  };

  const exportCSV = () => {
    const csv = toCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 text-sm"
          onClick={addRow}
          title="Add Row"
        >
          <Plus size={14} />
          <span>Row</span>
        </button>
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 text-sm"
          onClick={addColumn}
          title="Add Column"
        >
          <Plus size={14} />
          <span>Column</span>
        </button>
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 text-sm text-red-600"
          onClick={deleteSelectedRows}
          title="Delete Selected"
          disabled={selectedRows.size === 0}
        >
          <Trash2 size={14} />
        </button>
        <div className="flex-1" />
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 text-sm"
          onClick={exportCSV}
          title="Export CSV"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
        <span className="ml-2 text-xs text-gray-500">
          {rows.length} rows × {headers.length} columns
        </span>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden">
        <DataGrid
          columns={columns}
          rows={rows}
          onRowsChange={onRowsChange}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          rowKeyGetter={(row) => row._id}
          className="rdg-light dark:rdg-dark h-full"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};
