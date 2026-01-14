// Vercel Serverless Function Entry Point
// Re-export the Express app from the backend folder
import app from '../backend/api/index.js';

// Vercel expects the default export to be the Express app
export default app;

// Also export the config for Vercel
export const config = {
  api: {
    bodyParser: false, // Let Express handle body parsing
  },
};
