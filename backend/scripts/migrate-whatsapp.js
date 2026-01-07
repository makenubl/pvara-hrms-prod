import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import User from '../models/User.js';
import Task from '../models/Task.js';

dotenv.config();

function normalizeWhatsAppNumber(value) {
  if (typeof value !== 'string') return value;
  let normalized = value.trim();
  if (normalized.length === 0) return '';

  if (normalized.toLowerCase().startsWith('whatsapp:')) {
    normalized = normalized.slice('whatsapp:'.length);
  }

  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (!normalized.startsWith('+')) {
    if (/^\d+$/.test(normalized)) {
      normalized = `+${normalized}`;
    }
  }

  return normalized;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  logger.info('🔧 Connecting to MongoDB for WhatsApp migration...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  const defaultPreferences = {
    enabled: true,
    taskAssigned: true,
    taskUpdates: true,
    reminders: true,
    reminderIntervals: [1440, 240, 60, 30],
  };

  // 1) Ensure whatsappPreferences exist for existing users
  logger.info('🔧 Ensuring default whatsappPreferences for users missing it...');
  const prefsResult = await User.updateMany(
    { whatsappPreferences: { $exists: false } },
    { $set: { whatsappPreferences: defaultPreferences } }
  );
  logger.info('✅ whatsappPreferences backfill complete', {
    matched: prefsResult.matchedCount,
    modified: prefsResult.modifiedCount,
  });

  // 2) Detect normalization collisions BEFORE writing
  logger.info('🔎 Scanning whatsappNumber values for normalization collisions...');
  const usersWithWhatsApp = await User.find(
    { whatsappNumber: { $exists: true, $ne: null, $ne: '' } },
    { _id: 1, whatsappNumber: 1, email: 1 }
  ).lean();

  const collisions = new Map();
  const normalizedToUsers = new Map();

  for (const user of usersWithWhatsApp) {
    const normalized = normalizeWhatsAppNumber(user.whatsappNumber);
    if (!normalized) continue;

    const list = normalizedToUsers.get(normalized) || [];
    list.push({ _id: user._id, email: user.email, original: user.whatsappNumber });
    normalizedToUsers.set(normalized, list);
  }

  for (const [normalized, list] of normalizedToUsers.entries()) {
    if (list.length > 1) {
      collisions.set(normalized, list);
    }
  }

  if (collisions.size > 0) {
    logger.error('❌ WhatsApp normalization collisions detected. Resolve duplicates before enforcing uniqueness.', {
      collisionCount: collisions.size,
    });

    for (const [normalized, list] of collisions.entries()) {
      logger.error('Collision', { normalized, users: list });
    }

    // Don’t write changes that could break unique constraints.
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  // 3) Normalize stored whatsappNumber values where needed
  logger.info('🔧 Normalizing stored whatsappNumber values...');
  let normalizedCount = 0;

  for (const user of usersWithWhatsApp) {
    const normalized = normalizeWhatsAppNumber(user.whatsappNumber);
    if (!normalized || normalized === user.whatsappNumber) continue;

    const updateResult = await User.updateOne(
      { _id: user._id },
      { $set: { whatsappNumber: normalized } }
    );

    if (updateResult.modifiedCount > 0) normalizedCount += 1;
  }

  logger.info('✅ whatsappNumber normalization complete', { updated: normalizedCount });

  // 4) Sync indexes to ensure unique whatsappNumber and task reminder-related indexes exist
  logger.info('🔧 Syncing User indexes (including unique whatsappNumber)...');
  const userIndexResult = await User.syncIndexes();
  logger.info('✅ User index sync complete', { result: userIndexResult });

  logger.info('🔧 Syncing Task indexes (deadline/assignee indexes used by reminders)...');
  const taskIndexResult = await Task.syncIndexes();
  logger.info('✅ Task index sync complete', { result: taskIndexResult });

  await mongoose.disconnect();
  logger.info('✅ Disconnected');
}

main().catch((err) => {
  // Keep this readable in scripts
  // eslint-disable-next-line no-console
  console.error('❌ migrate-whatsapp failed:', err);
  process.exitCode = 1;
});
