import { useEffect } from 'react';
import { FileUpload } from '@/pages/Home/Components/FileUpload';
import { ChatInterface } from './Components/ChatInterface';
import { useHomeState, useHomeMutations, useHomeHandlers } from './modules';

interface HomeProps {
  resetTrigger?: number;
  loadedSessionData?: any;
}

export default function Home({ resetTrigger = 0, loadedSessionData }: HomeProps) {
  const {
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
    resetState,
  } = useHomeState();

  const { uploadMutation, chatMutation } = useHomeMutations({
    sessionId,
    messages,
    setSessionId,
    setInitialCharts,
    setInitialInsights,
    setSampleRows,
    setColumns,
    setNumericColumns,
    setDateColumns,
    setTotalRows,
    setTotalColumns,
    setMessages,
  });

  const { handleFileSelect, handleSendMessage, handleUploadNew } = useHomeHandlers({
    sessionId,
    messages,
    setMessages,
    uploadMutation,
    chatMutation,
    resetState,
  });

  // Reset state only when resetTrigger changes (upload new file)
  useEffect(() => {
    if (resetTrigger > 0) {
      resetState();
    }
  }, [resetTrigger, resetState]);

  // Load session data when provided
  useEffect(() => {
    if (loadedSessionData) {
      console.log('🔄 Loading session data into Home component:', loadedSessionData);
      
      // Extract session data
      const session = loadedSessionData.session;
      if (session) {
        // Set session ID
        setSessionId(session.sessionId);
        
        // Set initial charts and insights
        setInitialCharts(session.charts || []);
        setInitialInsights(session.insights || []);
        
        // Set data summary information
        if (session.dataSummary) {
          setSampleRows(session.sampleRows || []);
          setColumns(session.dataSummary.columns?.map((c: any) => c.name) || []);
          setNumericColumns(session.dataSummary.numericColumns || []);
          setDateColumns(session.dataSummary.dateColumns || []);
          setTotalRows(session.dataSummary.rowCount || 0);
          setTotalColumns(session.dataSummary.columnCount || 0);
        }
        
        // Create initial message with loaded data
        const initialMessage = {
          role: 'assistant' as const,
          content: `Welcome back! I've loaded your previous analysis of ${session.fileName}.\n\n📊 ${session.dataSummary?.rowCount || 0} rows and ${session.dataSummary?.columnCount || 0} columns\n🔢 ${session.dataSummary?.numericColumns?.length || 0} numeric columns\n📅 ${session.dataSummary?.dateColumns?.length || 0} date columns\n\nYou can continue asking questions about your data or explore the ${session.charts?.length || 0} charts I generated earlier.`,
          charts: session.charts || [],
          insights: session.insights || [],
          timestamp: Date.now(),
        };
        
        setMessages([initialMessage]);
      }
    }
  }, [loadedSessionData, setSessionId, setInitialCharts, setInitialInsights, setSampleRows, setColumns, setNumericColumns, setDateColumns, setTotalRows, setTotalColumns, setMessages]);

  if (!sessionId) {
    return (
      <FileUpload
        onFileSelect={handleFileSelect}
        isUploading={uploadMutation.isPending}
      />
    );
  }

  return (
    <ChatInterface
      messages={messages}
      onSendMessage={handleSendMessage}
      onUploadNew={handleUploadNew}
      isLoading={chatMutation.isPending}
      sampleRows={sampleRows}
      columns={columns}
      numericColumns={numericColumns}
      dateColumns={dateColumns}
      totalRows={totalRows}
      totalColumns={totalColumns}
    />
  );
}
