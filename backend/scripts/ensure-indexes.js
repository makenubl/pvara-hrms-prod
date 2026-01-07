import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import User from '../models/User.js';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  logger.info('🔧 Connecting to MongoDB to sync indexes...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  logger.info('🔧 Syncing User indexes (including unique whatsappNumber)...');
  const result = await User.syncIndexes();
  logger.info('✅ Index sync complete', { result });

  await mongoose.disconnect();
  logger.info('✅ Disconnected');
}

main().catch((err) => {
  // Keep this readable in scripts
  // eslint-disable-next-line no-console
  console.error('❌ ensure-indexes failed:', err);
  process.exitCode = 1;
});
