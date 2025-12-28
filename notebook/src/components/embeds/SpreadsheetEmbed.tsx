import React, { useState, useEffect } from 'react';
import 'react-data-grid/lib/styles.css';
import { DataGrid } from 'react-data-grid';

interface SpreadsheetEmbedProps {
  dataString: string;
  onChange: (newData: string) => void;
}

interface Row {
  [key: string]: string;
}

const createColumns = (count: number) => {
  const cols = [];
  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode(65 + i); // A, B, C...
    cols.push({
      key: i.toString(),
      name: letter,
      editable: true,
      resizable: true,
      width: 100
    });
  }
  return cols;
};

const createEmptyRows = (rowCount: number, colCount: number) => {
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Row = {};
    for (let j = 0; j < colCount; j++) {
      row[j.toString()] = '';
    }
    rows.push(row);
  }
  return rows;
};

export const SpreadsheetEmbed: React.FC<SpreadsheetEmbedProps> = ({ dataString, onChange }) => {
  const [columns] = useState(() => createColumns(26)); // A-Z
  const [rows, setRows] = useState<Row[]>(() => {
    if (dataString && dataString.trim() !== '') {
      try {
        return JSON.parse(dataString);
      } catch (e) {
        console.error("Failed to parse Spreadsheet data", e);
        return createEmptyRows(50, 26);
      }
    }
    return createEmptyRows(50, 26);
  });

  const isMounted = React.useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      onChange(JSON.stringify(rows));
    } else {
      isMounted.current = true;
    }
  }, [rows]);

  const onRowsChange = (newRows: Row[]) => {
    setRows(newRows);
  };

  return (
    <div className="w-full h-full overflow-hidden bg-white dark:bg-gray-900 text-black dark:text-white">
      <DataGrid
        columns={columns}
        rows={rows}
        onRowsChange={onRowsChange}
        className="rdg-light dark:rdg-dark h-full"
        style={{ height: '100%' }}
      />
    </div>
  );
};
