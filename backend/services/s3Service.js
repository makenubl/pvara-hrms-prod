import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'path';
import crypto from 'crypto';

/**
 * S3 Storage Service
 * Handles file uploads, downloads, and management in AWS S3
 */

// S3 Client configuration
const getS3Client = () => {
  const region = process.env.AWS_REGION || 'us-west-2';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

// Get bucket name from environment
const getBucketName = () => {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error('S3_BUCKET_NAME not configured in environment variables.');
  }
  return bucket;
};

// Check if S3 storage mode is enabled
export const isS3Enabled = () => {
  return process.env.STORAGE_MODE === 's3';
};

/**
 * Generate a unique S3 key for a file
 * Format: {folder}/{timestamp}-{random}-{filename}
 */
export const generateS3Key = (folder, originalFilename) => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9-_.]/g, '_');
  return `${folder}/${timestamp}-${randomStr}-${safeFilename}`;
};

/**
 * Upload a file buffer to S3
 * @param {Buffer} buffer - File content
 * @param {string} folder - Folder/prefix in S3
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{s3Key: string, s3Url: string, bucket: string}>}
 */
export const uploadToS3 = async (buffer, folder, originalFilename, mimeType = 'application/octet-stream') => {
  const s3Client = getS3Client();
  const bucket = getBucketName();
  const s3Key = generateS3Key(folder, originalFilename);

  console.log(`📤 [S3] Uploading file: ${originalFilename}`);
  console.log(`   Bucket: ${bucket}`);
  console.log(`   Key: ${s3Key}`);
  console.log(`   Size: ${buffer.length} bytes`);
  console.log(`   MIME: ${mimeType}`);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: {
      'original-filename': originalFilename,
      'upload-timestamp': new Date().toISOString()
    }
  });

  await s3Client.send(command);

  const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${s3Key}`;
  
  console.log(`✅ [S3] Upload complete: ${s3Url}`);

  return {
    s3Key,
    s3Url,
    bucket
  };
};

/**
 * Upload a file using multipart upload (for large files)
 * @param {Buffer|ReadableStream} body - File content
 * @param {string} folder - Folder/prefix in S3
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - MIME type
 * @param {function} onProgress - Progress callback
 */
export const uploadLargeToS3 = async (body, folder, originalFilename, mimeType, onProgress) => {
  const s3Client = getS3Client();
  const bucket = getBucketName();
  const s3Key = generateS3Key(folder, originalFilename);

  console.log(`📤 [S3] Starting multipart upload: ${originalFilename}`);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: s3Key,
      Body: body,
      ContentType: mimeType,
      Metadata: {
        'original-filename': originalFilename,
        'upload-timestamp': new Date().toISOString()
      }
    }
  });

  if (onProgress) {
    upload.on('httpUploadProgress', onProgress);
  }

  await upload.done();

  const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${s3Key}`;
  
  console.log(`✅ [S3] Multipart upload complete: ${s3Url}`);

  return {
    s3Key,
    s3Url,
    bucket
  };
};

/**
 * Get a signed URL for downloading a file
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 */
export const getSignedDownloadUrl = async (s3Key, expiresIn = 3600) => {
  const s3Client = getS3Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
};

/**
 * Download a file from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<{body: ReadableStream, contentType: string, contentLength: number}>}
 */
export const downloadFromS3 = async (s3Key) => {
  const s3Client = getS3Client();
  const bucket = getBucketName();

  console.log(`📥 [S3] Downloading: ${s3Key}`);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key
  });

  const response = await s3Client.send(command);
  
  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength
  };
};

/**
 * Get file as buffer from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Buffer>}
 */
export const getS3FileAsBuffer = async (s3Key) => {
  const { body } = await downloadFromS3(s3Key);
  
  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * Delete a file from S3
 * @param {string} s3Key - S3 object key
 */
export const deleteFromS3 = async (s3Key) => {
  const s3Client = getS3Client();
  const bucket = getBucketName();

  console.log(`🗑️ [S3] Deleting: ${s3Key}`);

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: s3Key
  });

  await s3Client.send(command);
  console.log(`✅ [S3] Deleted: ${s3Key}`);
};

/**
 * Check if a file exists in S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<boolean>}
 */
export const existsInS3 = async (s3Key) => {
  const s3Client = getS3Client();
  const bucket = getBucketName();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: s3Key
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Get file metadata from S3
 * @param {string} s3Key - S3 object key
 */
export const getS3FileMetadata = async (s3Key) => {
  const s3Client = getS3Client();
  const bucket = getBucketName();

  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: s3Key
  });

  const response = await s3Client.send(command);
  
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata
  };
};

/**
 * Get MIME type from filename
 */
export const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

export default {
  isS3Enabled,
  generateS3Key,
  uploadToS3,
  uploadLargeToS3,
  getSignedDownloadUrl,
  downloadFromS3,
  getS3FileAsBuffer,
  deleteFromS3,
  existsInS3,
  getS3FileMetadata,
  getMimeType
};
