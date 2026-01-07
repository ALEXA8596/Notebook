import React, { useState, useEffect, useMemo } from 'react';
import 'react-data-grid/lib/styles.css';
import { DataGrid, SelectColumn } from 'react-data-grid';
import type { RenderEditCellProps } from 'react-data-grid';
import { Plus, Minus, RowsIcon, Columns, Trash2 } from 'lucide-react';

interface SpreadsheetEmbedProps {
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

const createColumns = (count: number) => {
  const cols = [];
  for (let i = 0; i < count; i++) {
    const letter = i < 26 ? String.fromCharCode(65 + i) : 
      String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
    cols.push({
      key: i.toString(),
      name: letter,
      editable: true,
      resizable: true,
      width: 100,
      renderEditCell: TextEditor
    });
  }
  return cols;
};

const createEmptyRows = (rowCount: number, colCount: number): Row[] => {
  const rows: Row[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Row = { _id: getNextRowId() };
    for (let j = 0; j < colCount; j++) {
      row[j.toString()] = '';
    }
    rows.push(row);
  }
  return rows;
};

export const SpreadsheetEmbed: React.FC<SpreadsheetEmbedProps> = ({ dataString, onChange }) => {
  const [colCount, setColCount] = useState(26);
  const [rows, setRows] = useState<Row[]>(() => {
    if (dataString && dataString.trim() !== '') {
      try {
        const parsed = JSON.parse(dataString);
        let loadedRows: Row[] = [];
        if (parsed.rows && parsed.colCount) {
          loadedRows = parsed.rows;
        } else if (Array.isArray(parsed)) {
          // Legacy format - just rows
          loadedRows = parsed;
        }
        // Ensure all rows have _id
        return loadedRows.map((row: Row) => ({
          ...row,
          _id: row._id ?? getNextRowId()
        }));
      } catch (e) {
        console.error("Failed to parse Spreadsheet data", e);
        return createEmptyRows(50, 26);
      }
    }
    return createEmptyRows(50, 26);
  });

  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());

  const columns = useMemo(() => {
    return [
      SelectColumn,
      ...createColumns(colCount)
    ];
  }, [colCount]);

  const isMounted = React.useRef(false);
  const onChangeRef = React.useRef(onChange);
  
  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // Load colCount from dataString
    if (dataString && dataString.trim() !== '') {
      try {
        const parsed = JSON.parse(dataString);
        if (parsed.colCount) {
          setColCount(parsed.colCount);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      onChangeRef.current(JSON.stringify({ rows, colCount }));
    } else {
      isMounted.current = true;
    }
  }, [rows, colCount]);

  const onRowsChange = (newRows: Row[]) => {
    setRows(newRows);
  };

  const addRow = () => {
    const newRow: Row = { _id: getNextRowId() };
    for (let j = 0; j < colCount; j++) {
      newRow[j.toString()] = '';
    }
    setRows([...rows, newRow]);
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    const newRows = rows.filter((_, index) => !selectedRows.has(index));
    setRows(newRows.length > 0 ? newRows : createEmptyRows(1, colCount));
    setSelectedRows(new Set());
  };

  const addColumn = () => {
    const newColIndex = colCount;
    setColCount(colCount + 1);
    setRows(rows.map(row => ({
      ...row,
      [newColIndex.toString()]: ''
    })));
  };

  const deleteLastColumn = () => {
    if (colCount <= 1) return;
    const newColCount = colCount - 1;
    setColCount(newColCount);
    setRows(rows.map(row => {
      const newRow = { ...row };
      delete newRow[newColCount.toString()];
      return newRow;
    }));
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      setRows(createEmptyRows(50, colCount));
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <span className="text-xs text-gray-500 mr-1">Rows:</span>
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            onClick={addRow}
            title="Add Row"
          >
            <Plus size={14} />
          </button>
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            onClick={deleteSelectedRows}
            disabled={selectedRows.size === 0}
            title="Delete Selected Rows"
          >
            <Minus size={14} />
          </button>
        </div>
        
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <span className="text-xs text-gray-500 mr-1">Columns:</span>
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            onClick={addColumn}
            title="Add Column"
          >
            <Plus size={14} />
          </button>
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            onClick={deleteLastColumn}
            disabled={colCount <= 1}
            title="Delete Last Column"
          >
            <Minus size={14} />
          </button>
        </div>

        <button
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
          onClick={clearAll}
          title="Clear All"
        >
          <Trash2 size={14} />
        </button>

        <span className="ml-auto text-xs text-gray-500">
          {rows.length} rows × {colCount} columns
          {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
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
