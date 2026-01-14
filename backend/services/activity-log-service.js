/**
 * Activity Log Service
 * Tracks user activities for audit trail
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Activity Schema for MongoDB
const activityLogSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userEmail: { type: String },
  userRole: { type: String },
  action: { type: String, required: true },
  folder: { type: String },
  document: { type: String },
  version: { type: Number },
  meta: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

activityLogSchema.index({ folder: 1 });
activityLogSchema.index({ timestamp: -1 });

// Get or create model
let ActivityLog;
try {
  ActivityLog = mongoose.model('ActivityLog');
} catch {
  ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
}

/**
 * Append activity to MongoDB
 */
export async function appendActivityToDb(entry) {
  try {
    await ActivityLog.create({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log activity to DB:', error);
  }
}

/**
 * Read activities from MongoDB
 */
export async function readActivitiesFromDb(folder) {
  try {
    const query = folder ? { folder } : {};
    return await ActivityLog.find(query).sort({ timestamp: -1 }).limit(100).lean();
  } catch (error) {
    console.error('Failed to read activities from DB:', error);
    return [];
  }
}

/**
 * File-based activity logging (fallback/local)
 * Note: In serverless environments (Vercel), file-based logging won't work.
 * We gracefully fallback to MongoDB-only in those cases.
 */
function getLogsPath(baseFolder) {
  const logsDir = path.join(baseFolder, '.logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  } catch (err) {
    // Serverless environment - filesystem is read-only
    return null;
  }
  return path.join(logsDir, 'activity.log.json');
}

export function appendActivity(baseFolder, entry) {
  const now = new Date().toISOString();
  const payload = { ...entry, timestamp: now };
  
  // Try file-based logging (works in local/dev mode)
  const file = getLogsPath(baseFolder);
  if (file) {
    try {
      let list = [];
      if (fs.existsSync(file)) {
        try { list = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
      }
      list.push(payload);
      fs.writeFileSync(file, JSON.stringify(list, null, 2));
    } catch (err) {
      // Ignore file errors in serverless - MongoDB is the primary storage
      console.warn('File-based activity logging skipped (serverless mode)');
    }
  }
  
  // Always save to MongoDB (works in all environments)
  appendActivityToDb(payload);
  
  return payload;
}

export function readActivities(baseFolder) {
  const file = getLogsPath(baseFolder);
  if (!file || !fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}

export default {
  appendActivity,
  readActivities,
  appendActivityToDb,
  readActivitiesFromDb
};
