import { useState, useCallback } from 'react';
import { Message, UploadResponse } from '@shared/schema';

export interface HomeState {
  sessionId: string | null;
  messages: Message[];
  initialCharts: UploadResponse['charts'];
  initialInsights: UploadResponse['insights'];
  sampleRows: Record<string, any>[];
  columns: string[];
}

export const useHomeState = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialCharts, setInitialCharts] = useState<UploadResponse['charts']>([]);
  const [initialInsights, setInitialInsights] = useState<UploadResponse['insights']>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  const resetState = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setInitialCharts([]);
    setInitialInsights([]);
    setSampleRows([]);
    setColumns([]);
  }, []);

  return {
    // State values
    sessionId,
    messages,
    initialCharts,
    initialInsights,
    sampleRows,
    columns,
    
    // State setters
    setSessionId,
    setMessages,
    setInitialCharts,
    setInitialInsights,
    setSampleRows,
    setColumns,
    
    // Helper functions
    resetState,
  };
};
