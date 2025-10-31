# Chat Flow in Previous Analysis Sessions

## Overview
When a user asks a question in a previous analysis session, the system retrieves the full analysis data from CosmosDB and uses it to answer the question while maintaining conversation context.

## Complete Flow

### 1. Frontend Request
**File:** `client/src/pages/Home/modules/useHomeMutations.ts` (line 82-93)

When user sends a message:
```typescript
POST /api/chat
{
  sessionId: "session_123...",
  message: "What affects sales?",
  chatHistory: [/* last messages array */]
}
```

### 2. Server Receives Request
**File:** `server/controllers/chatController.ts` (line 8-22)

- Extracts `sessionId`, `message`, `chatHistory`, and `username` from request
- Validates required fields

### 3. Retrieve Chat Document from CosmosDB
**File:** `server/lib/cosmosDB.ts` (line 224-237)

```typescript
const chatDocument = await getChatBySessionIdEfficient(sessionId);
```

Query: `SELECT * FROM c WHERE c.sessionId = @sessionId`

**Returns:**
- `rawData`: Full dataset (entire rows/columns)
- `dataSummary`: Column metadata (types, names, counts)
- `messages`: Previous chat history
- `charts`, `insights`, etc.

### 4. Process Question
**File:** `server/lib/dataAnalyzer.ts` → `answerQuestion()` (line 74-215)

```typescript
const result = await answerQuestion(
  chatDocument.rawData,        // Full dataset from DB
  message,                      // User's question
  chatHistory || [],            // Last 4 messages for context
  chatDocument.dataSummary      // Column metadata
);
```

### 5. AI Processing (Two Paths)

#### Path A: Correlation Questions
**File:** `server/lib/dataAnalyzer.ts` (line 85-211)

- Detects correlation keywords ("what affects", "correlation", etc.)
- Uses `classifyQuestion()` to identify target variable
- Calls `analyzeCorrelations()`:
  - Calculates Pearson correlations
  - Generates scatter plots with trend lines
  - Creates correlation bar charts
  - Adds axis labels (`xLabel`, `yLabel`)

#### Path B: General Questions
**File:** `server/lib/dataAnalyzer.ts` → `generateGeneralAnswer()` (line 586-703)

- Uses last 4 messages for context:
  ```typescript
  const historyContext = chatHistory
    .slice(-4)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');
  ```
- Sends to OpenAI with:
  - Current question
  - Data context (columns, types, row count)
  - Chat history context
- Generates answer and optional chart specs

### 6. Enrich Charts
**File:** `server/controllers/chatController.ts` (line 33-54)

For each generated chart:
- Processes chart data: `processChartData(chatDocument.rawData, chartSpec)`
- Generates insights: `generateChartInsights(chart, data, summary)`
- Adds `xLabel` and `yLabel` (from column names)
- Adds `keyInsight` and `recommendation`

### 7. Save to CosmosDB
**File:** `server/controllers/chatController.ts` (line 59-81)

```typescript
// Save user message
await addMessageToChat(chatDocument.id, username, {
  role: 'user',
  content: message,
  timestamp: Date.now(),
});

// Save assistant response
await addMessageToChat(chatDocument.id, username, {
  role: 'assistant',
  content: validated.answer,
  charts: validated.charts,
  insights: validated.insights,
  timestamp: Date.now(),
});
```

### 8. Return Response
**File:** `server/controllers/chatController.ts` (line 83)

```json
{
  "answer": "AI-generated answer text",
  "charts": [
    {
      "type": "bar",
      "title": "Chart Title",
      "x": "column_name",
      "y": "column_name",
      "xLabel": "X Axis Label",
      "yLabel": "Y Axis Label",
      "data": [...],
      "keyInsight": "Insight text",
      "recommendation": "Recommendation text"
    }
  ],
  "insights": [...]
}
```

### 9. Frontend Display
**File:** `client/src/pages/Home/modules/useHomeMutations.ts` (line 94-103)

- Adds assistant message to local state
- Updates UI with answer, charts, and insights
- Charts display with axis labels in `ChartRenderer` and `ChartModal`

## Key Features

✅ **No Re-upload Required**: Uses data from CosmosDB  
✅ **Context Aware**: Uses last 4 messages for conversation continuity  
✅ **Persistent**: All messages saved to database  
✅ **Full Dataset Access**: Can analyze any part of the original data  
✅ **Session Continuity**: Same `sessionId` maintains conversation thread  

## Data Flow Diagram

```
User Question
    ↓
Frontend (sends sessionId + message + chatHistory)
    ↓
Server Controller (chatController.ts)
    ↓
CosmosDB Query (getChatBySessionIdEfficient)
    ↓
Retrieve: rawData + dataSummary + messages
    ↓
answerQuestion(dataAnalyzer.ts)
    ├─→ Correlation? → analyzeCorrelations()
    └─→ General? → generateGeneralAnswer()
           ↓
    AI Processing (OpenAI)
           ↓
    Generate charts with xLabel/yLabel
           ↓
    Enrich with insights
           ↓
Save messages to CosmosDB
           ↓
Return response to frontend
           ↓
Display charts with axis labels
```

