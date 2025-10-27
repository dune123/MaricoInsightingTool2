import { useState } from 'react';
import { ChevronDown, ChevronRight, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColumnsDisplay } from './ColumnsDisplay';

interface DataPreviewProps {
  data: Record<string, any>[];
  columns: string[];
  numericColumns?: string[];
  dateColumns?: string[];
  totalRows?: number;
  totalColumns?: number;
  defaultExpanded?: boolean;
}

export function DataPreview({ 
  data, 
  columns, 
  numericColumns = [], 
  dateColumns = [], 
  totalRows,
  totalColumns,
  defaultExpanded = false 
}: DataPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!data || data.length === 0) return null;

  return (
    <div className="mt-4" data-testid="data-preview-container">
      {/* Columns Display */}
      <ColumnsDisplay 
        columns={columns}
        numericColumns={numericColumns}
        dateColumns={dateColumns}
        totalRows={totalRows}
        totalColumns={totalColumns}
      />
      
      {/* Data Preview Table */}
      <div className="border rounded-md">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-start gap-2 rounded-none border-b hover-elevate active-elevate-2"
          data-testid="button-toggle-preview"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Table className="h-4 w-4" />
          <span className="font-medium">Data Preview</span>
          <span className="text-muted-foreground ml-1">
            ({data.length} {data.length === 1 ? 'row' : 'rows'})
          </span>
        </Button>

        {isExpanded && (
          <div className="h-80 overflow-auto relative" data-testid="preview-table-scroll">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b bg-gray-100 shadow-sm">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap bg-gray-100"
                      data-testid={`header-${col}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                    data-testid={`row-${rowIdx}`}
                  >
                    {columns.map((col, colIdx) => {
                      const value = row[col];
                      let displayValue = value;
                      
                      // Format decimal numbers to 2 decimal places
                      if (value !== null && value !== undefined) {
                        if (typeof value === 'number' && !Number.isInteger(value)) {
                          displayValue = value.toFixed(2);
                        } else {
                          displayValue = String(value);
                        }
                      } else {
                        displayValue = '—';
                      }
                      
                      return (
                        <td
                          key={colIdx}
                          className="px-4 py-2 whitespace-nowrap"
                          data-testid={`cell-${rowIdx}-${col}`}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
