import { useState, useCallback } from 'react';
import { Message, UploadResponse } from '@shared/schema';

export interface HomeState {
  sessionId: string | null;
  messages: Message[];
  initialCharts: UploadResponse['charts'];
  initialInsights: UploadResponse['insights'];
  sampleRows: Record<string, any>[];
  columns: string[];
  numericColumns: string[];
  dateColumns: string[];
  totalRows: number;
  totalColumns: number;
}

export const useHomeState = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialCharts, setInitialCharts] = useState<UploadResponse['charts']>([]);
  const [initialInsights, setInitialInsights] = useState<UploadResponse['insights']>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [dateColumns, setDateColumns] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [totalColumns, setTotalColumns] = useState<number>(0);

  const resetState = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setInitialCharts([]);
    setInitialInsights([]);
    setSampleRows([]);
    setColumns([]);
    setNumericColumns([]);
    setDateColumns([]);
    setTotalRows(0);
    setTotalColumns(0);
  }, []);

  return {
    // State values
    sessionId,
    messages,
    initialCharts,
    initialInsights,
    sampleRows,
    columns,
    numericColumns,
    dateColumns,
    totalRows,
    totalColumns,
    
    // State setters
    setSessionId,
    setMessages,
    setInitialCharts,
    setInitialInsights,
    setSampleRows,
    setColumns,
    setNumericColumns,
    setDateColumns,
    setTotalRows,
    setTotalColumns,
    
    // Helper functions
    resetState,
  };
};
