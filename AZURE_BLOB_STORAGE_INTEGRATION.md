# Azure Blob Storage Integration for Marico Insights Tool

This document describes the Azure Blob Storage integration implemented for saving and managing uploaded CSV/Excel files.

## Overview

The application now integrates with Azure Blob Storage to:
- Save uploaded CSV/Excel files persistently
- Organize files by user with folder structure
- Provide file management capabilities (list, download, delete)
- Generate temporary access URLs for secure file sharing

## Environment Configuration

Add these environment variables to your `.env` file:

```env
# Azure Blob Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=maricoinsightblobstorage
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_access_key_here
AZURE_STORAGE_CONTAINER_NAME=maricoinsight
```

## File Organization Structure

Files are organized in Azure Blob Storage with the following structure:

```
maricoinsight/
├── user1@example.com/
│   ├── 1761451200000/
│   │   ├── data_file_1.csv
│   │   └── analysis_report.xlsx
│   └── 1761451300000/
│       └── sales_data.xlsx
├── user2@example.com/
│   └── 1761451400000/
│       └── customer_data.csv
```

**Blob Name Format**: `{sanitized_username}/{timestamp}/{sanitized_filename}`

## API Endpoints

### File Upload (Enhanced)
- **POST** `/api/upload`
- **Body**: `{ file, username }` (username can also be sent via `X-User-Email` header)
- **Response**: Includes `blobInfo` with blob URL and name

### File Management
- **GET** `/api/files/user/:username` - Get all files for a user
- **GET** `/api/files/:blobName/metadata` - Get file metadata
- **GET** `/api/files/:blobName/download` - Download a file
- **POST** `/api/files/:blobName/access-url` - Generate temporary access URL
- **DELETE** `/api/files/:blobName` - Delete a file

## Features

### 1. Automatic File Upload
- When a file is uploaded via `/api/upload`, it's automatically saved to Azure Blob Storage
- Files are organized by user email with timestamp-based folders
- Original file names are preserved in metadata

### 2. User Isolation
- Each user's files are stored in separate folders
- Security checks ensure users can only access their own files
- Username sanitization prevents path traversal attacks

### 3. File Metadata
- Original filename stored in blob metadata
- Upload timestamp and user information preserved
- File size and last modified date tracked

### 4. Temporary Access URLs
- Generate SAS URLs for secure temporary file access
- Configurable expiration time (default: 60 minutes)
- Useful for sharing files without exposing storage credentials

## Usage Examples

### 1. Upload File with User Context
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('username', 'user@example.com');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Blob URL:', result.blobInfo.blobUrl);
console.log('Blob Name:', result.blobInfo.blobName);
```

### 2. List User Files
```javascript
const response = await fetch('/api/files/user/user@example.com');
const { files } = await response.json();

files.forEach(file => {
  console.log(`File: ${file.blobName}`);
  console.log(`Size: ${file.size} bytes`);
  console.log(`Last Modified: ${file.lastModified}`);
});
```

### 3. Download a File
```javascript
const response = await fetch('/api/files/user@example.com_1761451200000_data_file.csv/download');
const blob = await response.blob();
// Process the downloaded file
```

### 4. Generate Temporary Access URL
```javascript
const response = await fetch('/api/files/user@example.com_1761451200000_data_file.csv/access-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ expiresInMinutes: 120 })
});

const { sasUrl, expiresAt } = await response.json();
console.log('Temporary URL:', sasUrl);
console.log('Expires at:', expiresAt);
```

### 5. Delete a File
```javascript
const response = await fetch('/api/files/user@example.com_1761451200000_data_file.csv', {
  method: 'DELETE',
  headers: { 'X-User-Email': 'user@example.com' }
});
```

## Error Handling

- **Graceful Degradation**: If blob storage is unavailable, upload continues without failing
- **Security Checks**: Users can only access their own files
- **Comprehensive Logging**: All operations are logged for debugging
- **Error Recovery**: Failed operations don't break the core functionality

## Security Features

### 1. User Isolation
- Files are organized by sanitized username
- Access control prevents cross-user file access
- Path traversal attacks are prevented

### 2. Secure Access
- SAS URLs provide temporary, secure access
- No direct exposure of storage account credentials
- Configurable expiration times

### 3. Input Validation
- File names are sanitized before storage
- Username validation prevents malicious paths
- Content type validation for uploaded files

## Performance Considerations

- **Parallel Operations**: File upload and processing happen concurrently
- **Efficient Storage**: Files are stored with appropriate content types
- **Metadata Optimization**: Essential metadata is stored for quick access
- **Lazy Loading**: Files are only downloaded when requested

## Monitoring and Logging

- All blob storage operations are logged
- Success and error messages are clearly indicated
- Performance metrics can be monitored through Azure portal
- Application continues to work even if blob storage is unavailable

## Integration with CosmosDB

The blob storage integration works seamlessly with CosmosDB:
- Chat documents can reference blob URLs
- File metadata is stored in both systems
- Users can access their files through chat history
- Complete audit trail of file operations

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify `AZURE_STORAGE_ACCOUNT_KEY` is correct
   - Check that the storage account name matches

2. **Container Access Issues**
   - Ensure the container `maricoinsight` exists
   - Verify container permissions

3. **File Upload Failures**
   - Check network connectivity to Azure
   - Verify file size limits
   - Check Azure storage quotas

### Debug Mode

Enable detailed logging by checking the server console output:
- Blob storage initialization status
- File upload success/failure messages
- Error details for troubleshooting

## Future Enhancements

- **File Versioning**: Keep multiple versions of uploaded files
- **Compression**: Compress files before storage to save space
- **CDN Integration**: Use Azure CDN for faster file access
- **Batch Operations**: Support for bulk file operations
- **File Sharing**: Direct sharing capabilities between users

