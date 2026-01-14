/**
 * Storage Routes
 * Handles folder management, file uploads, recommendations, and AI chat
 * Supports S3 storage with MongoDB metadata or local filesystem
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { 
  listRecommendations, 
  acceptOrRejectRecommendations,
  deleteRecommendationsForDocument,
  extractTextFromBuffer
} from '../services/recommendations-service.js';
import { chatWithAI, applyChangesWithAI } from '../services/openai-service.js';
import { appendActivity, readActivities } from '../services/activity-log-service.js';
import pdfParse from 'pdf-parse';

// S3 and Document imports
import { uploadToS3, deleteFromS3, getSignedDownloadUrl, getS3FileAsBuffer } from '../services/s3Service.js';
import Document from '../models/Document.js';
import Folder from '../models/Folder.js';

// Storage mode getter - reads at runtime to ensure dotenv is loaded
const getStorageMode = () => process.env.STORAGE_MODE || 'local';

// Log storage mode on first request (will be accurate after dotenv loads)
let storageModuleLogged = false;
const logStorageMode = () => {
  if (!storageModuleLogged) {
    const mode = getStorageMode();
    console.log(`\n📦 STORAGE MODULE ACTIVE`);
    console.log(`   Storage Mode: ${mode}`);
    console.log(`   S3 Bucket: ${process.env.S3_BUCKET_NAME || 'NOT SET'}`);
    console.log(`   AWS Region: ${process.env.AWS_REGION || 'NOT SET'}\n`);
    storageModuleLogged = true;
  }
};

const router = express.Router();

// Base directory for storage folders
function getApplicationsBasePath() {
  const base = path.join(process.cwd(), 'uploads', 'storage');
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

// Safe folder name resolution
function resolveFolder(folderName) {
  const base = getApplicationsBasePath();
  const safeName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const full = path.join(base, safeName);
  return { base, safeName, full };
}

// Helper to read file text (supports both local and S3)
async function readFileText(filePath, s3Key = null) {
  try {
    let buffer;
    const storageMode = getStorageMode();
    
    if (storageMode === 's3' && s3Key) {
      // Read from S3
      buffer = await getS3FileAsBuffer(s3Key);
      if (!buffer) {
        return '[File not found in S3]';
      }
    } else {
      // Read from local filesystem
      if (!fs.existsSync(filePath)) {
        return '[File not found]';
      }
      
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return '[File is empty]';
      }
      
      buffer = fs.readFileSync(filePath);
    }
    
    const lower = (s3Key || filePath).toLowerCase();
    if (lower.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return data.text || '';
    }
    // Plain text fallback
    return buffer.toString('utf-8');
  } catch (err) {
    console.error('Error reading file:', s3Key || filePath, err);
    return '[Error: Could not extract text]';
  }
}

// Helper to get file text
async function getFileText(folderName, fileName) {
  const storageMode = getStorageMode();
  if (storageMode === 's3') {
    const s3Key = `${folderName}/documents/${fileName}`;
    return readFileText(null, s3Key);
  } else {
    const { full } = resolveFolder(folderName);
    const filePath = path.join(full, 'documents', fileName);
    return readFileText(filePath);
  }
}

// Multer storage configuration - always use memory storage, decide at upload time
// This allows runtime checking of STORAGE_MODE after dotenv loads
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Create a new folder
router.post('/folders', authenticate, async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  try {
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const userId = req.user?._id;
    const userEmail = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Check if folder already exists for this user in MongoDB
    const existingFolder = await Folder.findByNameAndOwner(safeName, userId);
    if (existingFolder) {
      return res.status(409).json({ error: 'Folder already exists', folder: safeName });
    }
    
    // Create folder record in MongoDB (user-specific)
    const folderRecord = new Folder({
      name: name,
      safeName: safeName,
      owner: userId,
      ownerEmail: userEmail,
      company: req.user?.company || null
    });
    await folderRecord.save();
    
    // Also create local folder structure (for backward compatibility)
    const { full } = resolveFolder(safeName);
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
      const docsDir = path.join(full, 'documents');
      fs.mkdirSync(docsDir, { recursive: true });
    }

    appendActivity(getApplicationsBasePath(), {
      id: `create-${safeName}-${Date.now()}`,
      userEmail: userEmail || '',
      userRole: req.user?.role || '',
      action: 'create-folder',
      folder: safeName,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Folder created',
      folder: safeName,
      folderId: folderRecord._id
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return res.status(500).json({ error: error.message || 'Failed to create folder' });
  }
});

// Delete a folder
router.delete('/folders', authenticate, async (req, res) => {
  const { folder } = req.body || {};
  if (!folder || typeof folder !== 'string') {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  try {
    const safeName = folder.replace(/[^a-zA-Z0-9-_]/g, '_');
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Check if folder exists and belongs to this user
    const folderRecord = await Folder.findByNameAndOwner(safeName, userId);
    if (!folderRecord) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    // Soft delete folder in MongoDB
    await folderRecord.softDelete(userId);
    
    // Soft delete all documents in this folder for this user
    await Document.updateMany(
      { folder: safeName, uploadedBy: userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: userId }
    );
    
    // Also delete from local filesystem if exists (for backward compatibility)
    const { full } = resolveFolder(safeName);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
    }

    appendActivity(getApplicationsBasePath(), {
      id: `delete-${safeName}-${Date.now()}`,
      userEmail: req.user?.email || '',
      userRole: req.user?.role || '',
      action: 'delete-folder',
      folder: safeName,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      message: 'Folder deleted',
      folder: safeName
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete folder' });
  }
});

// List folders (only user's own folders)
router.get('/folders', authenticate, async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Get folders from MongoDB that belong to this user
    const userFolders = await Folder.findByOwner(userId);
    const folders = userFolders.map(f => f.safeName);
    
    console.log(`📁 User ${req.user?.email} has ${folders.length} folders: ${folders.join(', ') || 'none'}`);
    
    res.json({ folders, storage: 'user-filtered' });
  } catch (error) {
    console.error('Error listing folders:', error);
    res.status(500).json({ error: error.message || 'Failed to list folders' });
  }
});

// Upload files to folder
router.post('/upload', authenticate, upload.array('files', 20), async (req, res) => {
  const folderName = String(req.body.folder || req.query.folder || '');
  if (!folderName) {
    return res.status(400).json({ error: 'Target folder is required' });
  }

  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'No files uploaded. Use field name "files".' });
  }

  try {
    const uploadedFiles = [];
    const storageMode = getStorageMode();
    logStorageMode();
    
    if (storageMode === 's3') {
      // S3 Upload Mode
      console.log(`\n${'='.repeat(60)}`);
      console.log(`☁️  S3 FILE UPLOAD`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📅 Timestamp: ${new Date().toISOString()}`);
      console.log(`👤 User: ${req.user?.email || 'Unknown'}`);
      console.log(`📁 Target Folder: ${folderName}`);
      console.log(`📦 Files to Upload: ${files.length}`);
      
      for (const file of files) {
        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9-_.]/g, '_');
        const s3Folder = `${folderName}/documents`;
        
        console.log(`\n   📄 Processing File: ${file.originalname}`);
        console.log(`      Safe Name: ${safeFileName}`);
        console.log(`      Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`      MIME Type: ${file.mimetype}`);
        console.log(`      S3 Folder: ${s3Folder}`);
        
        // Upload to S3 (buffer, folder, filename, mimeType)
        console.log(`      ⏳ Uploading to S3...`);
        const s3Result = await uploadToS3(file.buffer, s3Folder, safeFileName, file.mimetype);
        console.log(`      ✅ S3 Upload Complete`);
        console.log(`         S3 Key: ${s3Result.s3Key}`);
        console.log(`         S3 URL: ${s3Result.s3Url}`);
        
        // Save metadata to MongoDB
        console.log(`      ⏳ Saving metadata to MongoDB...`);
        const documentRecord = new Document({
          filename: safeFileName,
          originalName: file.originalname,
          s3Key: s3Result.s3Key,
          s3Bucket: s3Result.bucket,
          s3Url: s3Result.s3Url,
          mimeType: file.mimetype,
          size: file.size,
          folder: folderName,
          company: req.user?.company || null,
          uploadedBy: req.user?._id || null,
          uploadedByEmail: req.user?.email || null,
          status: 'uploaded'
        });
        
        await documentRecord.save();
        console.log(`      ✅ MongoDB Record Created`);
        console.log(`         Document ID: ${documentRecord._id}`);
        console.log(`         Bucket: ${s3Result.bucket}`);
        
        uploadedFiles.push({
          name: safeFileName,
          size: file.size,
          s3Key: s3Result.s3Key,
          s3Url: s3Result.s3Url,
          mongoId: documentRecord._id
        });
      }
      
      // Summary log for S3 upload
      console.log(`\n📊 S3 UPLOAD SUMMARY`);
      console.log(`   Total Files: ${uploadedFiles.length}`);
      console.log(`   Total Size: ${(uploadedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2)} KB`);
      console.log(`   Files: ${uploadedFiles.map(f => f.name).join(', ')}`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      // Local Storage Mode - write files from memory to disk
      console.log(`📁 Local Storage Mode - Writing ${files.length} file(s) to disk...`);
      const { full } = resolveFolder(folderName);
      const docsDir = path.join(full, 'documents');
      if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      
      for (const file of files) {
        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9-_.]/g, '_');
        const filePath = path.join(docsDir, safeFileName);
        fs.writeFileSync(filePath, file.buffer);
        uploadedFiles.push({ name: safeFileName, size: file.size });
        console.log(`   ✅ Saved: ${safeFileName}`);
      }
      
      // Update application.json documents list
      const appJsonPath = path.join(full, 'application.json');
      if (fs.existsSync(appJsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
          const added = uploadedFiles.map(f => f.name);
          data.documents = Array.from(new Set([...(data.documents || []), ...added]));
          fs.writeFileSync(appJsonPath, JSON.stringify(data, null, 2));
        } catch {}
      }
    }

    appendActivity(getApplicationsBasePath(), {
      id: `upload-${folderName}-${Date.now()}`,
      userEmail: req.user?.email || '',
      userRole: req.user?.role || '',
      action: 'upload-files',
      folder: folderName,
      meta: { files: uploadedFiles.map(f => f.name), storage: storageMode },
      timestamp: new Date().toISOString(),
    });
    
    console.log(`📤 Upload complete - Files: ${uploadedFiles.map(f => f.name).join(', ')} (Storage: ${storageMode})`);
    
    return res.status(200).json({
      message: 'Files uploaded',
      folder: folderName,
      files: uploadedFiles,
      storage: storageMode
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload files' });
  }
});

// List files in folder (only user's own files)
router.get('/files', authenticate, async (req, res) => {
  const folderName = String(req.query.folder || '');
  if (!folderName) {
    return res.status(400).json({ error: 'Folder is required' });
  }
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const safeFolderName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // Verify the folder belongs to this user
    const folderRecord = await Folder.findByNameAndOwner(safeFolderName, userId);
    if (!folderRecord) {
      return res.status(403).json({ error: 'Access denied to this folder' });
    }
    
    const storageMode = getStorageMode();
    if (storageMode === 's3') {
      // Query MongoDB for files in this folder OWNED BY THIS USER
      const documents = await Document.find({
        folder: safeFolderName,
        uploadedBy: userId,
        isDeleted: false
      }).sort({ createdAt: -1 });
      
      const files = documents.map(doc => ({
        name: doc.filename,
        size: doc.size,
        uploadedAt: doc.createdAt,
        s3Key: doc.s3Key,
        mongoId: doc._id
      }));
      
      console.log(`📄 User ${req.user?.email} has ${files.length} files in folder "${safeFolderName}"`);
      res.json({ files, storage: 's3' });
    } else {
      // Local storage - files are already in user-specific folder structure
      const { full } = resolveFolder(safeFolderName);
      const docsDir = path.join(full, 'documents');
      if (!fs.existsSync(docsDir)) {
        return res.json({ files: [], storage: 'local' });
      }
      const files = fs.readdirSync(docsDir).filter(n => !n.startsWith('.'));
      res.json({ files, storage: 'local' });
    }
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message || 'Failed to list files' });
  }
});

// Download file
router.get('/download', authenticate, async (req, res) => {
  const folderName = String(req.query.folder || '');
  const fileName = String(req.query.file || '');
  
  if (!folderName || !fileName) {
    return res.status(400).json({ error: 'folder and file are required' });
  }
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const storageMode = getStorageMode();
    if (storageMode === 's3') {
      // Find document in MongoDB by folder, filename, AND user ownership
      const document = await Document.findOne({ 
        folder: folderName, 
        filename: fileName,
        uploadedBy: userId,
        isDeleted: { $ne: true }
      });
      
      if (!document) {
        return res.status(404).json({ error: 'File not found or access denied' });
      }
      
      // Generate signed URL for download
      const signedUrl = await getSignedDownloadUrl(document.s3Key, 300); // 5 minute expiry
      
      // Redirect to signed URL or return it
      res.json({ 
        downloadUrl: signedUrl, 
        fileName: document.filename,
        storage: 's3'
      });
    } else {
      // Local storage - verify folder ownership first
      const safeFolderName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const folderRecord = await Folder.findByNameAndOwner(safeFolderName, userId);
      if (!folderRecord) {
        return res.status(403).json({ error: 'Access denied to this folder' });
      }
      
      const { full } = resolveFolder(folderName);
      const filePath = path.join(full, 'documents', fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.download(filePath, fileName);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message || 'Failed to download file' });
  }
});

// Delete file
router.delete('/files', authenticate, async (req, res) => {
  const { folder, fileName } = req.body || {};
  if (!folder || !fileName) {
    return res.status(400).json({ error: 'folder and fileName are required' });
  }
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const safeFolderName = String(folder).replace(/[^a-zA-Z0-9-_]/g, '_');
    const storageMode = getStorageMode();
    
    if (storageMode === 's3') {
      // Find document in MongoDB by folder, filename, AND user ownership
      const document = await Document.findOne({ 
        folder: safeFolderName, 
        filename: String(fileName),
        uploadedBy: userId,
        isDeleted: { $ne: true }
      });
      
      if (!document) {
        return res.status(404).json({ error: 'File not found or access denied' });
      }
      
      // Delete from S3
      await deleteFromS3(document.s3Key);
      
      // Soft delete in MongoDB
      document.isDeleted = true;
      document.deletedAt = new Date();
      document.deletedBy = userId;
      await document.save();
      
      console.log(`🗑️ Deleted from S3 for user ${req.user?.email}: ${document.s3Key}`);
    } else {
      // Local storage - verify folder ownership first
      const folderRecord = await Folder.findByNameAndOwner(safeFolderName, userId);
      if (!folderRecord) {
        return res.status(403).json({ error: 'Access denied to this folder' });
      }
      
      const { full } = resolveFolder(safeFolderName);
      const filePath = path.join(full, 'documents', String(fileName));
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      fs.unlinkSync(filePath);
    }
    
    // Delete associated recommendations
    await deleteRecommendationsForDocument(safeFolderName, String(fileName));
    
    appendActivity(getApplicationsBasePath(), {
      id: `delete-file-${folder}-${Date.now()}`,
      userEmail: req.user?.email || '',
      userRole: req.user?.role || '',
      action: 'delete-file',
      folder: safeFolderName,
      meta: { fileName: String(fileName), storage: storageMode },
      timestamp: new Date().toISOString(),
    });
    
    res.json({ message: 'File deleted successfully', storage: storageMode });
  } catch (e) {
    console.error('Error deleting file:', e);
    res.status(500).json({ error: e?.message || 'Failed to delete file' });
  }
});

// Get recommendations for folder/document
router.get('/recommendations', authenticate, async (req, res) => {
  const folderName = String(req.query.folder || '');
  const documentName = req.query.document ? String(req.query.document) : undefined;
  
  if (!folderName) {
    return res.status(400).json({ error: 'Folder is required' });
  }
  
  try {
    const trail = await listRecommendations(folderName, documentName);
    
    // Filter out recommendations for files that no longer exist
    const { full } = resolveFolder(folderName);
    const filteredTrail = trail.filter(entry => {
      const docPath = path.join(full, 'documents', entry.documentName);
      return fs.existsSync(docPath);
    });
    
    res.json({ trail: filteredTrail });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to list recommendations' });
  }
});

// Accept/reject recommendations
router.post('/recommendations/decision', authenticate, async (req, res) => {
  const { folder, document, version, acceptIds, rejectIds } = req.body || {};
  
  if (!folder || !document || typeof version !== 'number') {
    return res.status(400).json({ error: 'folder, document, and numeric version are required' });
  }
  
  try {
    await acceptOrRejectRecommendations(String(folder), String(document), Number(version), acceptIds || [], rejectIds || []);
    
    appendActivity(getApplicationsBasePath(), {
      id: `decide-${folder}-${document}-${version}-${Date.now()}`,
      userEmail: req.user?.email || '',
      userRole: req.user?.role || '',
      action: 'recommendations-decision',
      folder: String(folder),
      document: String(document),
      version: Number(version),
      meta: { acceptIds: acceptIds || [], rejectIds: rejectIds || [] },
      timestamp: new Date().toISOString(),
    });
    
    res.json({ message: 'Updated recommendation statuses' });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to update recommendation statuses' });
  }
});

// AI Chat endpoint
router.post('/chat', authenticate, async (req, res) => {
  const { folder, document, message } = req.body || {};
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔷 STORAGE CHAT REQUEST`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`👤 User: ${req.user?.email || 'Unknown'} (${req.user?.role || 'Unknown Role'})`);
  console.log(`📁 Folder: ${folder}`);
  console.log(`📄 Document: ${document || 'None specified'}`);
  console.log(`💬 Message: "${message}"`);
  
  if (!folder || typeof message !== 'string') {
    console.log(`❌ Validation failed: folder and message are required`);
    return res.status(400).json({ error: 'folder and message are required' });
  }
  
  const normalized = String(message).toLowerCase();
  let applied = 0;
  let reply = '';
  
  try {
    // Get current recommendations context
    console.log(`📊 Loading recommendations context...`);
    const trail = await listRecommendations(String(folder), document ? String(document) : undefined);
    const pendingCount = (trail || []).reduce((sum, e) => 
      sum + (e.recommendations || []).filter(r => r.status === 'pending').length, 0);
    const acceptedCount = (trail || []).reduce((sum, e) => 
      sum + (e.recommendations || []).filter(r => r.status === 'accepted').length, 0);
    const rejectedCount = (trail || []).reduce((sum, e) => 
      sum + (e.recommendations || []).filter(r => r.status === 'rejected').length, 0);
    
    console.log(`   📋 Recommendations Stats: Pending=${pendingCount}, Accepted=${acceptedCount}, Rejected=${rejectedCount}`);
    console.log(`   📁 Trail entries: ${trail?.length || 0}`);
    
    // Check for action intents
    if (normalized.includes('apply') && (normalized.includes('all') || normalized.includes('pending'))) {
      for (const entry of trail || []) {
        const pendingIds = (entry.recommendations || []).filter(r => r.status === 'pending').map(r => r.id);
        if (pendingIds.length) {
          await acceptOrRejectRecommendations(String(folder), String(entry.documentName), Number(entry.version), pendingIds, []);
          applied += pendingIds.length;
        }
      }
      reply = applied
        ? `✅ Done! I applied ${applied} pending recommendation(s) for you.`
        : 'There are no pending recommendations to apply at the moment.';
    } else if (normalized.includes('reject') && normalized.includes('all')) {
      for (const entry of trail || []) {
        const pendingIds = (entry.recommendations || []).filter(r => r.status === 'pending').map(r => r.id);
        if (pendingIds.length) {
          await acceptOrRejectRecommendations(String(folder), String(entry.documentName), Number(entry.version), [], pendingIds);
          applied += pendingIds.length;
        }
      }
      reply = applied
        ? `❌ Rejected ${applied} pending recommendation(s).`
        : 'There are no pending recommendations to reject.';
    } else {
      // Use AI for conversational responses
      console.log(`🤖 Using AI for conversational response...`);
      
      const recommendationsSummary = (trail || []).map(e => ({
        document: e.documentName,
        version: e.version,
        recommendations: (e.recommendations || []).map(r => ({
          status: r.status,
          point: r.point
        }))
      }));
      
      console.log(`   📋 Recommendations Summary: ${JSON.stringify(recommendationsSummary).substring(0, 200)}...`);
      
      // Read document content if specified
      let documentContent = '';
      if (document) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📖 DOCUMENT CONTENT FOR OPENAI`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log(`📄 Document Name: ${document}`);
        console.log(`📁 Folder: ${folder}`);
        console.log(`🔧 Storage Mode: ${getStorageMode()}`);
        
        documentContent = await getFileText(String(folder), String(document));
        
        console.log(`✅ Document Content Extracted`);
        console.log(`   📊 Content Length: ${documentContent.length} characters`);
        console.log(`   📊 Word Count: ~${documentContent.split(/\s+/).length} words`);
        console.log(`   📄 Content Preview (first 500 chars):`);
        console.log(`   ${'─'.repeat(50)}`);
        console.log(`   ${documentContent.substring(0, 500).replace(/\n/g, '\n   ')}`);
        console.log(`   ${'─'.repeat(50)}`);
        console.log(`🚀 This content will be sent to OpenAI for analysis`);
      } else {
        console.log(`📖 No specific document - AI will respond based on folder context only`);
      }
      
      console.log(`\n🤖 SENDING REQUEST TO OPENAI...`);
      reply = await chatWithAI(folder, document, message, {
        pendingCount,
        acceptedCount,
        rejectedCount,
        recommendationsSummary,
        documentContent
      });
      console.log(`✅ AI Reply received (${reply.length} chars)`);
    }
    
    // Log activity
    appendActivity(getApplicationsBasePath(), {
      id: `chat-${folder}-${Date.now()}`,
      userEmail: req.user?.email || '',
      userRole: req.user?.role || '',
      action: 'chat',
      folder: String(folder),
      meta: { message, applied, reply: reply.substring(0, 100), document: document ? String(document) : undefined },
      timestamp: new Date().toISOString(),
    });
    
    console.log(`\n📤 CHAT RESPONSE`);
    console.log(`   Applied: ${applied}`);
    console.log(`   Reply Preview (first 200 chars): ${reply.substring(0, 200).replace(/\n/g, ' ')}${reply.length > 200 ? '...' : ''}`);
    console.log(`${'='.repeat(60)}\n`);
    
    res.json({ reply, applied });
  } catch (e) {
    console.error(`\n❌ CHAT ERROR`);
    console.error(`   Error: ${e?.message || 'Unknown error'}`);
    console.error(`   Stack: ${e?.stack || 'No stack trace'}`);
    console.log(`${'='.repeat(60)}\n`);
    res.status(500).json({ error: e?.message || 'Chat action failed' });
  }
});

// Get chat history placeholder
router.get('/chat', authenticate, async (_req, res) => {
  res.json({ history: [] });
});

// Apply changes with AI
router.post('/apply-changes', authenticate, async (req, res) => {
  const { folder, document, recommendations } = req.body;
  
  if (!folder || !document || !Array.isArray(recommendations)) {
    return res.status(400).json({ error: 'folder, document, and recommendations array are required' });
  }
  
  const startTime = Date.now();
  
  try {
    console.log(`📝 Applying ${recommendations.length} changes to: ${folder}/${document}`);
    
    // Read original file content
    const originalContent = await getFileText(String(folder), String(document));
    
    if (originalContent.startsWith('[File not found]') || originalContent.startsWith('[Error')) {
      return res.status(404).json({ error: 'Original file not found' });
    }
    
    console.log(`📖 Read ${originalContent.length} characters from original document`);
    
    // Use AI to apply changes
    const updatedContent = await applyChangesWithAI(originalContent, recommendations, document);
    
    const processTime = Date.now() - startTime;
    console.log(`✅ Document generated in ${processTime}ms`);
    
    // Create new versioned file
    const baseName = path.basename(String(document), path.extname(String(document)));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const newFileName = `${baseName}_updated_${timestamp}.txt`;
    
    const { full } = resolveFolder(String(folder));
    const newFilePath = path.join(full, 'documents', newFileName);
    fs.writeFileSync(newFilePath, updatedContent, 'utf-8');
    
    console.log(`💾 Saved updated document: ${newFileName}`);
    
    // Mark all recommendations as accepted
    const trail = await listRecommendations(String(folder), String(document));
    const entry = trail?.find(e => e.documentName === document);
    
    if (entry) {
      const allIds = entry.recommendations.map(r => r.id);
      await acceptOrRejectRecommendations(String(folder), String(document), Number(entry.version), allIds, []);
    }
    
    res.json({
      success: true,
      originalFileName: document,
      newFileName: newFileName,
      summary: `Applied ${recommendations.length} recommendation(s). New file created: ${newFileName}`,
      recommendationsApplied: recommendations.length,
      processingTimeMs: processTime
    });
  } catch (e) {
    console.error('Apply changes error:', e);
    res.status(500).json({ error: e?.message || 'Failed to apply changes' });
  }
});

// Activity log endpoint
router.get('/activity', authenticate, async (req, res) => {
  try {
    const folderName = String(req.query.folder || '');
    const base = getApplicationsBasePath();
    const all = readActivities(base);
    const filtered = folderName ? all.filter(a => a.folder === folderName) : all;
    res.json({ activities: filtered });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activities' });
  }
});

export default router;
