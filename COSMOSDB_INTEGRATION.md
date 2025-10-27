# CosmosDB Integration for Marico Insights Tool

This document describes the CosmosDB integration implemented for saving chats and charts data.

## Overview

The application now integrates with Azure CosmosDB to persistently store:
- Chat conversations with file uploads
- Generated charts and insights
- User-specific data organization
- Chat history and management

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# CosmosDB Configuration
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-primary-key
COSMOS_DATABASE_ID=marico-insights
COSMOS_CONTAINER_ID=chats
```

## Data Structure

### Chat Document
Each chat is stored as a document with the following structure:

```typescript
interface ChatDocument {
  id: string;                    // Unique chat ID (fileName + timestamp)
  username: string;              // User email
  fileName: string;              // Original uploaded file name
  uploadedAt: number;            // Upload timestamp
  createdAt: number;             // Chat creation timestamp
  lastUpdatedAt: number;         // Last update timestamp
  dataSummary: DataSummary;      // Data summary from file upload
  messages: Message[];           // Chat messages with charts and insights
  charts: ChartSpec[];           // All charts generated for this chat
  sessionId: string;             // Original session ID
}
```

### Partition Key
- **Partition Key**: `username` - This ensures efficient querying by user and better performance

## API Endpoints

### Upload File (Enhanced)
- **POST** `/api/upload`
- **Body**: `{ file, username }` (username can also be sent via `X-User-Email` header)
- **Response**: Includes `chatId` for the created chat document

### Chat with AI (Enhanced)
- **POST** `/api/chat`
- **Body**: `{ sessionId, message, chatHistory, username }`
- **Behavior**: Automatically saves user messages and AI responses to CosmosDB

### Chat Management
- **GET** `/api/chats/user/:username` - Get all chats for a user
- **GET** `/api/chats/:chatId` - Get specific chat details
- **DELETE** `/api/chats/:chatId` - Delete a chat
- **GET** `/api/chats/user/:username/statistics` - Get chat statistics

## Features

### 1. Automatic Chat Creation
- When a file is uploaded, a chat document is automatically created
- Chat ID is generated as `{fileName}_{timestamp}` for uniqueness
- Initial charts from file analysis are stored

### 2. Message Persistence
- All user messages and AI responses are saved
- Charts generated during conversations are stored
- Timestamps are maintained for all interactions

### 3. User Organization
- All chats are organized by username (email)
- Users can only access their own chats
- Efficient querying using CosmosDB partition key

### 4. Chart Management
- Charts are stored both in individual messages and in the main charts array
- Duplicate charts are avoided
- Full chart specifications are preserved

## Error Handling

- CosmosDB operations are wrapped in try-catch blocks
- If CosmosDB is unavailable, the application continues to function
- Errors are logged but don't break the core functionality
- Graceful degradation ensures upload and chat features work without CosmosDB

## Usage Examples

### 1. Upload File with User
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('username', 'user@example.com');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Chat ID:', result.chatId);
```

### 2. Chat with User Context
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Email': 'user@example.com'
  },
  body: JSON.stringify({
    sessionId: 'session-123',
    message: 'What insights can you provide?'
  })
});
```

### 3. Get User's Chat History
```javascript
const response = await fetch('/api/chats/user/user@example.com');
const { chats } = await response.json();
```

## Database Setup

1. Create a CosmosDB account in Azure
2. Create a database named `marico-insights` (or update `COSMOS_DATABASE_ID`)
3. Create a container named `chats` with partition key `/username`
4. Update environment variables with your CosmosDB credentials

## Performance Considerations

- Partition key is set to `username` for efficient user-based queries
- Indexes are automatically created for common query patterns
- Large chart data is stored efficiently in CosmosDB
- Queries are optimized for user-specific data access

## Security

- User data is isolated by username partition
- No cross-user data access is possible
- All operations require username authentication
- Sensitive data is not logged in console output

## Monitoring

- All CosmosDB operations are logged
- Success and error messages are clearly indicated
- Performance metrics can be monitored through Azure portal
- Application continues to work even if CosmosDB is unavailable

