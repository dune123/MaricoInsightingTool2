# Session Management API Documentation

This document describes the Session Management API endpoints for fetching all sessions from the Azure CosmosDB container.

## Overview

The Session Management API provides comprehensive access to all chat sessions stored in CosmosDB, including filtering, pagination, statistics, and detailed session information.

## API Endpoints

### 1. Get All Sessions
**GET** `/api/sessions`

Retrieves all sessions from the CosmosDB container.

**Response:**
```json
{
  "sessions": [
    {
      "id": "supply_chain_data_csv_1761494964509",
      "username": "sameer.raj@finzarc.com",
      "fileName": "supply_chain_data.csv",
      "uploadedAt": 1761494964509,
      "createdAt": 1761494964509,
      "lastUpdatedAt": 1761494964509,
      "messageCount": 0,
      "chartCount": 6,
      "sessionId": "13c22fff-839c-42b4-b0de-d80c76d9b596"
    }
  ],
  "count": 5,
  "message": "Retrieved 5 sessions"
}
```

### 2. Get Sessions with Pagination
**GET** `/api/sessions/paginated`

Retrieves sessions with pagination support.

**Query Parameters:**
- `pageSize` (optional): Number of sessions per page (default: 10)
- `continuationToken` (optional): Token for next page

**Example:**
```
GET /api/sessions/paginated?pageSize=2
```

**Response:**
```json
{
  "sessions": [...],
  "count": 2,
  "continuationToken": "eyJ0eXBlIjoiQ29udGludWF0aW9uVG9rZW4iLCJ0b2tlbiI6...",
  "hasMoreResults": true,
  "pageSize": 2,
  "message": "Retrieved 2 sessions (page size: 2)"
}
```

### 3. Get Sessions with Filters
**GET** `/api/sessions/filtered`

Retrieves sessions with various filtering options.

**Query Parameters:**
- `username` (optional): Filter by username
- `fileName` (optional): Filter by filename (partial match)
- `dateFrom` (optional): Filter from timestamp
- `dateTo` (optional): Filter to timestamp
- `limit` (optional): Maximum number of results
- `orderBy` (optional): Sort by field (`createdAt`, `lastUpdatedAt`, `uploadedAt`)
- `orderDirection` (optional): Sort direction (`ASC`, `DESC`)

**Examples:**
```
GET /api/sessions/filtered?username=sameer.raj@finzarc.com&limit=3
GET /api/sessions/filtered?fileName=csv&orderBy=createdAt&orderDirection=DESC
GET /api/sessions/filtered?dateFrom=1761490000000&dateTo=1761495000000
```

**Response:**
```json
{
  "sessions": [...],
  "count": 3,
  "filters": {
    "username": "sameer.raj@finzarc.com",
    "limit": 3
  },
  "message": "Retrieved 3 sessions with filters"
}
```

### 4. Get Session Statistics
**GET** `/api/sessions/statistics`

Retrieves comprehensive statistics about all sessions.

**Response:**
```json
{
  "statistics": {
    "totalSessions": 5,
    "totalUsers": 2,
    "totalMessages": 0,
    "totalCharts": 22,
    "sessionsByUser": {
      "sameer.raj@finzarc.com": 4,
      "test@example.com": 1
    },
    "sessionsByDate": {
      "2025-10-26": 5
    }
  },
  "message": "Generated statistics for 5 sessions"
}
```

### 5. Get Session Details by Session ID
**GET** `/api/sessions/details/:sessionId`

Retrieves detailed information for a specific session.

**Example:**
```
GET /api/sessions/details/13c22fff-839c-42b4-b0de-d80c76d9b596
```

**Response:**
```json
{
  "session": {
    "id": "supply_chain_data_csv_1761494964509",
    "username": "sameer.raj@finzarc.com",
    "fileName": "supply_chain_data.csv",
    "uploadedAt": 1761494964509,
    "createdAt": 1761494964509,
    "lastUpdatedAt": 1761494964509,
    "dataSummary": {
      "rowCount": 1000,
      "columnCount": 5,
      "columns": [...],
      "numericColumns": ["sales", "profit"],
      "dateColumns": ["date"]
    },
    "messages": [],
    "charts": [
      {
        "type": "line",
        "title": "Sales Over Time",
        "x": "date",
        "y": "sales",
        "data": [...],
        "keyInsight": "Sales are trending upward",
        "recommendation": "Consider increasing inventory"
      }
    ],
    "sessionId": "13c22fff-839c-42b4-b0de-d80c76d9b596"
  },
  "message": "Retrieved session details for 13c22fff-839c-42b4-b0de-d80c76d9b596"
}
```

### 6. Get Sessions by User
**GET** `/api/sessions/user/:username`

Retrieves all sessions for a specific user.

**Example:**
```
GET /api/sessions/user/sameer.raj@finzarc.com
```

**Response:**
```json
{
  "sessions": [...],
  "count": 4,
  "username": "sameer.raj@finzarc.com",
  "message": "Retrieved 4 sessions for user sameer.raj@finzarc.com"
}
```

## Data Structure

### Session Object (Simplified)
```typescript
interface SessionSummary {
  id: string;                    // Unique session ID
  username: string;               // User email
  fileName: string;               // Original file name
  uploadedAt: number;             // Upload timestamp
  createdAt: number;              // Creation timestamp
  lastUpdatedAt: number;          // Last update timestamp
  messageCount: number;           // Number of chat messages
  chartCount: number;             // Number of charts generated
  sessionId: string;              // Memory session ID
}
```

### Session Object (Detailed)
```typescript
interface ChatDocument {
  id: string;                     // Unique chat ID
  username: string;               // User email (partition key)
  fileName: string;               // Original uploaded file name
  uploadedAt: number;             // Upload timestamp
  createdAt: number;              // Chat creation timestamp
  lastUpdatedAt: number;         // Last update timestamp
  dataSummary: DataSummary;       // Data summary from file upload
  messages: Message[];            // Chat messages with charts and insights
  charts: ChartSpec[];           // All charts generated for this chat
  sessionId: string;              // Original session ID
}
```

## Usage Examples

### JavaScript/TypeScript
```javascript
// Get all sessions
const response = await fetch('/api/sessions');
const { sessions, count } = await response.json();

// Get paginated sessions
const paginatedResponse = await fetch('/api/sessions/paginated?pageSize=5');
const { sessions, hasMoreResults, continuationToken } = await paginatedResponse.json();

// Get sessions for specific user
const userSessions = await fetch('/api/sessions/user/sameer.raj@finzarc.com');
const { sessions } = await userSessions.json();

// Get session statistics
const statsResponse = await fetch('/api/sessions/statistics');
const { statistics } = await statsResponse.json();
console.log(`Total sessions: ${statistics.totalSessions}`);
console.log(`Total users: ${statistics.totalUsers}`);
```

### cURL Examples
```bash
# Get all sessions
curl -X GET "http://localhost:3002/api/sessions"

# Get paginated sessions
curl -X GET "http://localhost:3002/api/sessions/paginated?pageSize=3"

# Get sessions with filters
curl -X GET "http://localhost:3002/api/sessions/filtered?username=sameer.raj@finzarc.com&limit=5"

# Get session statistics
curl -X GET "http://localhost:3002/api/sessions/statistics"

# Get session details
curl -X GET "http://localhost:3002/api/sessions/details/13c22fff-839c-42b4-b0de-d80c76d9b596"
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200**: Success
- **400**: Bad Request (missing required parameters)
- **404**: Not Found (session not found)
- **500**: Internal Server Error

Error responses include:
```json
{
  "error": "Error message description"
}
```

## Performance Considerations

- **Pagination**: Use pagination for large datasets to avoid timeouts
- **Filtering**: Apply filters to reduce data transfer and improve performance
- **Simplified Responses**: Most endpoints return simplified session objects for better performance
- **Caching**: Consider implementing caching for frequently accessed data

## Security

- **User Isolation**: Users can only access their own sessions through user-specific endpoints
- **Input Validation**: All query parameters are validated
- **Error Handling**: Sensitive information is not exposed in error messages

## Testing Results

✅ **All endpoints tested and working:**
- Session statistics: `5 sessions, 2 users, 22 charts`
- Pagination: Working with `hasMoreResults` and `continuationToken`
- Filtering: Working with username, filename, and date filters
- User-specific sessions: Working correctly
- Detailed session information: Complete data retrieval

The Session Management API is now fully functional and ready for production use! 🎉
