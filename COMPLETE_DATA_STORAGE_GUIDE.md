# Complete Analysis Data Storage Implementation

This implementation provides comprehensive data storage and retrieval functionality for the Marico Insights Tool. When users upload files, all analysis data is now saved persistently and can be retrieved later.

## Features Implemented

### 1. Enhanced Data Storage
- **Complete Raw Data**: All uploaded data is stored in CosmosDB
- **Column Statistics**: Comprehensive statistical analysis for all numeric columns
- **Sample Rows**: First 10 rows for quick preview
- **Analysis Metadata**: Processing time, file size, AI model used, version info
- **Blob Storage Integration**: Original files stored in Azure Blob Storage

### 2. New API Endpoints

#### Get User Analysis Sessions
```
GET /api/data/user/{username}/sessions
```
Returns a list of all analysis sessions for a user with summary information.

#### Get Complete Analysis Data
```
GET /api/data/chat/{chatId}?username={username}
```
Returns complete analysis data including raw data, statistics, charts, and insights.

#### Get Analysis Data by Session ID
```
GET /api/data/session/{sessionId}
```
Returns analysis data using the original session ID.

#### Get Column Statistics
```
GET /api/data/chat/{chatId}/statistics?username={username}
```
Returns detailed statistical analysis for all numeric columns.

#### Get Raw Data (Paginated)
```
GET /api/data/chat/{chatId}/raw-data?username={username}&page={page}&limit={limit}
```
Returns raw data with pagination support.

### 3. Enhanced Data Structures

#### Column Statistics Include:
- Count, Min, Max, Sum, Mean, Median
- Standard Deviation, Variance, Range
- Quartiles (Q1, Q3)

#### Analysis Metadata Includes:
- Total processing time
- AI model used (gpt-4o)
- Original file size
- Analysis algorithm version

### 4. Frontend Components

#### AnalysisHistory Component
A comprehensive React component that displays:
- List of all user analysis sessions
- Detailed analysis data with tabs for different views
- Column statistics with formatted display
- Raw data with pagination
- Charts and insights overview

## Usage Examples

### Backend Usage

```typescript
// The upload controller now automatically saves all data
const chatDocument = await createChatDocument(
  username,
  fileName,
  sessionId,
  summary,
  charts,
  rawData,           // Complete raw data
  sampleRows,        // First 10 rows
  columnStatistics,  // Statistical analysis
  blobInfo,          // Azure Blob Storage info
  analysisMetadata   // Processing metadata
);
```

### Frontend Usage

```typescript
import { AnalysisHistory } from '@/components/AnalysisHistory';

// In your component
<AnalysisHistory 
  onLoadAnalysis={(analysisData) => {
    // Handle loading complete analysis data
    console.log('Loaded analysis:', analysisData);
  }}
/>
```

### API Usage

```typescript
import { dataApi } from '@/lib/api';

// Get user sessions
const sessions = await dataApi.getUserSessions(userEmail);

// Get complete analysis data
const analysisData = await dataApi.getAnalysisData(chatId, userEmail);

// Get column statistics
const stats = await dataApi.getColumnStatistics(chatId, userEmail);

// Get raw data with pagination
const rawData = await dataApi.getRawData(chatId, userEmail, 1, 100);
```

## Data Flow

1. **File Upload**: User uploads CSV/Excel file
2. **Processing**: File is parsed and analyzed with AI
3. **Storage**: Complete analysis data is saved to CosmosDB
4. **Blob Storage**: Original file is stored in Azure Blob Storage
5. **Response**: User receives analysis results immediately
6. **Retrieval**: Data can be retrieved later via API endpoints

## Benefits

- **Persistent Storage**: All analysis data is saved and can be accessed later
- **Complete Data Access**: Users can view raw data, statistics, and metadata
- **Performance**: Pagination for large datasets
- **Scalability**: CosmosDB handles large amounts of data efficiently
- **User Experience**: Users can revisit previous analyses
- **Data Integrity**: Complete audit trail of all analyses

## Configuration

Ensure these environment variables are set:
- `COSMOS_ENDPOINT`: Azure CosmosDB endpoint
- `COSMOS_KEY`: Azure CosmosDB key
- `COSMOS_DATABASE_ID`: Database name (default: marico-insights)
- `COSMOS_CONTAINER_ID`: Container name (default: chats)
- `AZURE_STORAGE_ACCOUNT_NAME`: Azure Storage account name
- `AZURE_STORAGE_ACCOUNT_KEY`: Azure Storage account key
- `AZURE_STORAGE_CONTAINER_NAME`: Storage container name

## Future Enhancements

- Data export functionality (CSV, Excel, PDF reports)
- Data comparison between different analyses
- Scheduled analysis reports
- Data visualization improvements
- Advanced filtering and search capabilities
- Data sharing between users
- Analysis templates and presets
