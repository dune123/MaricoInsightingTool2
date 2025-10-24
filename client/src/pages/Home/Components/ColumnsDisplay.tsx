import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Hash, Calendar, Type } from 'lucide-react';

interface ColumnsDisplayProps {
  columns: string[];
  numericColumns?: string[];
  dateColumns?: string[];
  totalRows?: number;
  totalColumns?: number;
}

export function ColumnsDisplay({ 
  columns, 
  numericColumns = [], 
  dateColumns = [], 
  totalRows,
  totalColumns 
}: ColumnsDisplayProps) {
  if (!columns || columns.length === 0) return null;

  const getColumnIcon = (column: string) => {
    if (numericColumns.includes(column)) {
      return <Hash className="h-3 w-3" />;
    }
    if (dateColumns.includes(column)) {
      return <Calendar className="h-3 w-3" />;
    }
    return <Type className="h-3 w-3" />;
  };

  const getColumnType = (column: string) => {
    if (numericColumns.includes(column)) {
      return 'numeric';
    }
    if (dateColumns.includes(column)) {
      return 'date';
    }
    return 'text';
  };

  return (
    <Card className="mb-4 border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-primary" />
          Dataset Columns
          {totalRows && totalColumns && (
            <span className="text-sm font-normal text-muted-foreground">
              ({totalRows} rows × {totalColumns} columns)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {columns.map((column, index) => (
            <Badge 
              key={index}
              variant="secondary" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            >
              {getColumnIcon(column)}
              <span>{column}</span>
              <Badge 
                variant="outline" 
                className="ml-1 px-1.5 py-0.5 text-xs bg-background"
              >
                {getColumnType(column)}
              </Badge>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
