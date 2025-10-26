import { z } from "zod";

// Chart Specifications
export const chartSpecSchema = z.object({
  type: z.enum(["line", "bar", "scatter", "pie", "area"]),
  title: z.string(),
  x: z.string(),
  y: z.string(),
  aggregate: z.enum(["sum", "mean", "count", "none"]).optional(),
  data: z.array(z.record(z.union([z.string(), z.number()]))).optional(),
  xDomain: z.tuple([z.number(), z.number()]).optional(), // [min, max] for X-axis
  yDomain: z.tuple([z.number(), z.number()]).optional(), // [min, max] for Y-axis
  keyInsight: z.string().optional(), // Key insight about the chart
  recommendation: z.string().optional(), // Actionable recommendation based on the chart
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

// Insights
export const insightSchema = z.object({
  id: z.number(),
  text: z.string(),
});

export type Insight = z.infer<typeof insightSchema>;

// Chat Messages
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  charts: z.array(chartSpecSchema).optional(),
  insights: z.array(insightSchema).optional(),
  timestamp: z.number(),
});

export type Message = z.infer<typeof messageSchema>;

// Data Summary
export const dataSummarySchema = z.object({
  rowCount: z.number(),
  columnCount: z.number(),
  columns: z.array(z.object({
    name: z.string(),
    type: z.string(),
    sampleValues: z.array(z.union([z.string(), z.number(), z.null()])),
  })),
  numericColumns: z.array(z.string()),
  dateColumns: z.array(z.string()),
});

export type DataSummary = z.infer<typeof dataSummarySchema>;

// Column Statistics Schema
export const columnStatisticsSchema = z.object({
  count: z.number(),
  min: z.number(),
  max: z.number(),
  sum: z.number(),
  mean: z.number(),
  median: z.number(),
  standardDeviation: z.number(),
  q1: z.number(),
  q3: z.number(),
  range: z.number(),
  variance: z.number(),
});

export type ColumnStatistics = z.infer<typeof columnStatisticsSchema>;

// Analysis Metadata Schema
export const analysisMetadataSchema = z.object({
  totalProcessingTime: z.number(),
  aiModelUsed: z.string(),
  fileSize: z.number(),
  analysisVersion: z.string(),
});

export type AnalysisMetadata = z.infer<typeof analysisMetadataSchema>;

// Complete Analysis Data Schema
export const completeAnalysisDataSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  uploadedAt: z.number(),
  createdAt: z.number(),
  lastUpdatedAt: z.number(),
  dataSummary: dataSummarySchema,
  rawData: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  sampleRows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  columnStatistics: z.record(z.string(), columnStatisticsSchema),
  charts: z.array(chartSpecSchema),
  insights: z.array(insightSchema),
  messages: z.array(messageSchema),
  blobInfo: z.object({
    blobUrl: z.string(),
    blobName: z.string(),
  }).optional(),
  analysisMetadata: analysisMetadataSchema,
  sessionId: z.string(),
});

export type CompleteAnalysisData = z.infer<typeof completeAnalysisDataSchema>;

// Analysis Session Summary Schema
export const analysisSessionSummarySchema = z.object({
  id: z.string(),
  fileName: z.string(),
  uploadedAt: z.number(),
  createdAt: z.number(),
  lastUpdatedAt: z.number(),
  dataSummary: dataSummarySchema,
  chartsCount: z.number(),
  insightsCount: z.number(),
  messagesCount: z.number(),
  blobInfo: z.object({
    blobUrl: z.string(),
    blobName: z.string(),
  }).optional(),
  analysisMetadata: analysisMetadataSchema,
  sessionId: z.string(),
});

export type AnalysisSessionSummary = z.infer<typeof analysisSessionSummarySchema>;

// API Response Types
export const uploadResponseSchema = z.object({
  sessionId: z.string(),
  summary: dataSummarySchema,
  charts: z.array(chartSpecSchema),
  insights: z.array(insightSchema),
  sampleRows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))).optional(),
  chatId: z.string().optional(), // CosmosDB chat document ID
  blobInfo: z.object({
    blobUrl: z.string(),
    blobName: z.string(),
  }).optional(), // Azure Blob Storage info
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

export const chatResponseSchema = z.object({
  answer: z.string(),
  charts: z.array(chartSpecSchema).optional(),
  insights: z.array(insightSchema).optional(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Data Retrieval Response Schemas
export const userAnalysisSessionsResponseSchema = z.object({
  sessions: z.array(analysisSessionSummarySchema),
  totalCount: z.number(),
});

export type UserAnalysisSessionsResponse = z.infer<typeof userAnalysisSessionsResponseSchema>;

export const columnStatisticsResponseSchema = z.object({
  chatId: z.string(),
  fileName: z.string(),
  columnStatistics: z.record(z.string(), columnStatisticsSchema),
  numericColumns: z.array(z.string()),
  totalNumericColumns: z.number(),
});

export type ColumnStatisticsResponse = z.infer<typeof columnStatisticsResponseSchema>;

export const rawDataResponseSchema = z.object({
  chatId: z.string(),
  fileName: z.string(),
  data: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalRows: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type RawDataResponse = z.infer<typeof rawDataResponseSchema>;

// Session Storage (backend only)
export interface SessionData {
  data: Record<string, any>[];
  summary: DataSummary;
  fileName: string;
  uploadedAt: number;
}
