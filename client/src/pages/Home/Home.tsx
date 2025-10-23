import { useEffect } from 'react';
import { FileUpload } from '@/pages/Home/Components/FileUpload';
import { ChatInterface } from './Components/ChatInterface';
import { useHomeState, useHomeMutations, useHomeHandlers } from './modules';

interface HomeProps {
  resetTrigger?: number;
}

export default function Home({ resetTrigger = 0 }: HomeProps) {
  const {
    sessionId,
    messages,
    initialCharts,
    initialInsights,
    sampleRows,
    columns,
    setSessionId,
    setMessages,
    setInitialCharts,
    setInitialInsights,
    setSampleRows,
    setColumns,
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
    />
  );
}
