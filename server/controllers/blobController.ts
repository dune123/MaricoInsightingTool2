import { Request, Response } from "express";
import { 
  listUserFiles, 
  getFileFromBlob, 
  deleteFileFromBlob,
  generateSasUrl 
} from "../lib/blobStorage.js";

// Get all files for a user from blob storage
export const getUserFiles = async (req: Request, res: Response) => {
  try {
    const username = req.params.username || req.headers['x-user-email'] || req.body.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const files = await listUserFiles(username);
    
    res.json({ files });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get user files',
    });
  }
};

// Download a specific file from blob storage
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { blobName } = req.params;
    const username = req.query.username as string || req.headers['x-user-email'] || req.body.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Verify the blob belongs to the user (security check)
    if (!blobName.startsWith(username.replace(/[^a-zA-Z0-9]/g, '_'))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fileBuffer = await getFileFromBlob(blobName);
    
    // Set appropriate headers for file download
    const fileName = blobName.split('/').pop() || 'file';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to download file',
    });
  }
};

// Delete a file from blob storage
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { blobName } = req.params;
    const username = req.body.username || req.headers['x-user-email'];
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Verify the blob belongs to the user (security check)
    if (!blobName.startsWith(username.replace(/[^a-zA-Z0-9]/g, '_'))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await deleteFileFromBlob(blobName);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete file',
    });
  }
};

// Generate a temporary SAS URL for file access
export const generateFileAccessUrl = async (req: Request, res: Response) => {
  try {
    const { blobName } = req.params;
    const { expiresInMinutes = 60 } = req.body;
    const username = req.body.username || req.headers['x-user-email'];
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Verify the blob belongs to the user (security check)
    if (!blobName.startsWith(username.replace(/[^a-zA-Z0-9]/g, '_'))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sasUrl = await generateSasUrl(blobName, expiresInMinutes);
    
    res.json({ 
      sasUrl,
      expiresInMinutes,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Generate file access URL error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate file access URL',
    });
  }
};

// Get file metadata
export const getFileMetadata = async (req: Request, res: Response) => {
  try {
    const { blobName } = req.params;
    const username = req.query.username as string || req.headers['x-user-email'] || req.body.username;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Verify the blob belongs to the user (security check)
    if (!blobName.startsWith(username.replace(/[^a-zA-Z0-9]/g, '_'))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = await listUserFiles(username);
    const file = files.find(f => f.blobName === blobName);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ 
      blobName: file.blobName,
      blobUrl: file.blobUrl,
      lastModified: file.lastModified,
      size: file.size,
      metadata: file.metadata
    });
  } catch (error) {
    console.error('Get file metadata error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get file metadata',
    });
  }
};

