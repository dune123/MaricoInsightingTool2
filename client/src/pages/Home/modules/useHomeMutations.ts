import { useMutation } from '@tanstack/react-query';
import { Message, UploadResponse, ChatResponse } from '@shared/schema';
import { apiRequest, uploadFile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UseHomeMutationsProps {
  sessionId: string | null;
  messages: Message[];
  setSessionId: (id: string | null) => void;
  setInitialCharts: (charts: UploadResponse['charts']) => void;
  setInitialInsights: (insights: UploadResponse['insights']) => void;
  setSampleRows: (rows: Record<string, any>[]) => void;
  setColumns: (columns: string[]) => void;
  setNumericColumns: (columns: string[]) => void;
  setDateColumns: (columns: string[]) => void;
  setTotalRows: (rows: number) => void;
  setTotalColumns: (columns: number) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}

export const useHomeMutations = ({
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
}: UseHomeMutationsProps) => {
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return await uploadFile<UploadResponse>('/api/upload', file);
    },
    onSuccess: (data) => {
      console.log("upload chart data from the backend", data);
      console.log("📊 Charts received:", data.charts?.length || 0);
      if (data.charts && Array.isArray(data.charts)) {
        data.charts.forEach((chart: any, idx: number) => {
          console.log(`  Chart ${idx + 1}: "${chart.title}" - Data points: ${chart.data?.length || 0}`);
        });
      }
      
      setSessionId(data.sessionId);
      setInitialCharts(data.charts);
      setInitialInsights(data.insights);
      
      // Store sample rows and columns for data preview
      if (data.sampleRows && data.sampleRows.length > 0) {
        setSampleRows(data.sampleRows);
        setColumns(data.summary.columns.map(c => c.name));
        setNumericColumns(data.summary.numericColumns);
        setDateColumns(data.summary.dateColumns);
        setTotalRows(data.summary.rowCount);
        setTotalColumns(data.summary.columnCount);
      }
      
      // Create initial assistant message with charts and insights
      const initialMessage: Message = {
        role: 'assistant',
        content: `I've analyzed your data! Here's what I found:\n\n📊 ${data.summary.rowCount} rows and ${data.summary.columnCount} columns\n🔢 ${data.summary.numericColumns.length} numeric columns\n📅 ${data.summary.dateColumns.length} date columns\n\nI've generated ${data.charts.length} visualizations and ${data.insights.length} key insights for you. Feel free to ask me any questions about your data!`,
        charts: data.charts,
        insights: data.insights,
        timestamp: Date.now(),
      };
      
      setMessages([initialMessage]);
      
      toast({
        title: 'Analysis Complete',
        description: 'Your data has been analyzed successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest<ChatResponse>({
        method: 'POST',
        route: '/api/chat',
        data: {
          sessionId,
          message,
        },
      });
    },
    onSuccess: (data, message) => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || '',
        charts: data.charts,
        insights: data.insights,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  return {
    uploadMutation,
    chatMutation,
  };
};
