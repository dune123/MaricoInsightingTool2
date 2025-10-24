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
          <div className="h-80 overflow-auto" data-testid="preview-table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap sticky top-0 bg-muted/50 z-10"
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
                    className="border-b last:border-b-0 hover-elevate"
                    data-testid={`row-${rowIdx}`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-4 py-2 whitespace-nowrap"
                        data-testid={`cell-${rowIdx}-${col}`}
                      >
                        {row[col] === null || row[col] === undefined
                          ? '—'
                          : String(row[col])}
                      </td>
                    ))}
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
