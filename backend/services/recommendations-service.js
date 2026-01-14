/**
 * Recommendations Service
 * Manages document recommendations with MongoDB storage
 */

import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { generateDocumentRecommendations } from './openai-service.js';
import fs from 'fs';
import pdfParse from 'pdf-parse';

// Recommendation Schema
const recommendationItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  point: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const documentRecommendationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, index: true }, // folder name
  documentName: { type: String, required: true },
  version: { type: Number, required: true },
  recommendations: [recommendationItemSchema],
  originalExtract: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create compound index
documentRecommendationSchema.index({ applicationId: 1, documentName: 1, version: 1 }, { unique: true });

// Get or create model
let DocumentRecommendation;
try {
  DocumentRecommendation = mongoose.model('DocumentRecommendation');
} catch {
  DocumentRecommendation = mongoose.model('DocumentRecommendation', documentRecommendationSchema);
}

/**
 * Read text from various file types
 */
async function readFileText(filePath) {
  try {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.pdf')) {
      const buffer = fs.readFileSync(filePath);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF parsing timeout')), 10000)
      );
      const parsePromise = pdfParse(buffer).then(data => data.text || '');
      return await Promise.race([parsePromise, timeoutPromise]);
    }
    if (lower.endsWith('.docx')) {
      // For docx, we'll read as text for now - mammoth can be added later
      return fs.readFileSync(filePath, 'utf-8');
    }
    // Fallback to plain text
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error('Error reading file:', err);
    return '';
  }
}

/**
 * Extract text from buffer
 */
export async function extractTextFromBuffer(buffer, fileName) {
  try {
    if (buffer.length === 0) {
      return '[File is empty - upload may have failed. Please re-upload this document.]';
    }
    
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return data.text || '';
    }
    // Fallback to plain text
    return buffer.toString('utf-8');
  } catch (err) {
    console.error('Error extracting text from buffer:', fileName, err);
    return '[Error: Could not extract text from this document.]';
  }
}

/**
 * Save a new version of recommendations
 */
export async function saveRecommendationsVersion(applicationId, documentName, version, recommendations, originalExtract) {
  await DocumentRecommendation.updateOne(
    { applicationId, documentName, version },
    {
      $set: {
        applicationId,
        documentName,
        version,
        recommendations,
        originalExtract,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
}

/**
 * Get recommendations trail for a folder/document
 */
export async function getRecommendationsTrail(applicationId, documentName) {
  const query = { applicationId };
  if (documentName) query.documentName = documentName;
  return await DocumentRecommendation.find(query).sort({ version: 1 }).lean();
}

/**
 * Update recommendation status (accept/reject)
 */
export async function updateRecommendationStatus(applicationId, documentName, version, ids, status) {
  await DocumentRecommendation.updateOne(
    { applicationId, documentName, version },
    {
      $set: {
        'recommendations.$[r].status': status,
        'recommendations.$[r].updatedAt': new Date()
      }
    },
    {
      arrayFilters: [{ 'r.id': { $in: ids } }]
    }
  );
}

/**
 * Delete recommendations for a document
 */
export async function deleteRecommendationsForDocument(applicationId, documentName) {
  await DocumentRecommendation.deleteMany({ applicationId, documentName });
  console.log(`🗑️  Deleted all recommendations for: ${documentName} in ${applicationId}`);
}

/**
 * Generate recommendations for an uploaded document
 */
export async function generateRecommendationsForUpload(applicationId, documentPath, documentName) {
  const trails = await getRecommendationsTrail(applicationId, documentName);
  const nextVersion = (trails[trails.length - 1]?.version || 0) + 1;

  console.log(`📄 Processing document: ${documentName} for folder: ${applicationId}`);
  const extract = await readFileText(documentPath);
  console.log(`📝 Extracted ${extract.length} characters from document`);

  // Generate AI-powered recommendations based on actual file content
  const points = await generateDocumentRecommendations(documentName, extract, applicationId);
  console.log(`💡 Generated ${points.length} recommendations`);

  const recommendations = points.map(p => ({ 
    id: uuidv4(), 
    point: p, 
    status: 'pending', 
    createdAt: new Date() 
  }));
  
  await saveRecommendationsVersion(applicationId, documentName, nextVersion, recommendations, extract);
  return { version: nextVersion, recommendations, extract };
}

/**
 * Accept or reject recommendations by IDs
 */
export async function acceptOrRejectRecommendations(applicationId, documentName, version, acceptIds, rejectIds) {
  if (acceptIds?.length) {
    await updateRecommendationStatus(applicationId, documentName, version, acceptIds, 'accepted');
  }
  if (rejectIds?.length) {
    await updateRecommendationStatus(applicationId, documentName, version, rejectIds, 'rejected');
  }
}

/**
 * List all recommendations for a folder/document
 */
export async function listRecommendations(applicationId, documentName) {
  return await getRecommendationsTrail(applicationId, documentName);
}

export default {
  saveRecommendationsVersion,
  getRecommendationsTrail,
  updateRecommendationStatus,
  deleteRecommendationsForDocument,
  generateRecommendationsForUpload,
  acceptOrRejectRecommendations,
  listRecommendations,
  extractTextFromBuffer
};
