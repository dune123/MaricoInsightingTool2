import { Message } from '@shared/schema';

interface UseHomeHandlersProps {
  sessionId: string | null;
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  uploadMutation: {
    mutate: (file: File) => void;
  };
  chatMutation: {
    mutate: (message: string) => void;
  };
  resetState: () => void;
}

export const useHomeHandlers = ({
  sessionId,
  messages,
  setMessages,
  uploadMutation,
  chatMutation,
  resetState,
}: UseHomeHandlersProps) => {
  const handleFileSelect = (file: File) => {
    uploadMutation.mutate(file);
  };

  const handleSendMessage = (message: string) => {
    if (!sessionId) return;
    
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(message);
  };

  const handleUploadNew = () => {
    resetState();
  };

  return {
    handleFileSelect,
    handleSendMessage,
    handleUploadNew,
  };
};
