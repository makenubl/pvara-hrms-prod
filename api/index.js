// Vercel Serverless Function Entry Point
import express from 'express';

let app;

try {
  // Re-export the Express app from the backend folder
  const backendApp = await import('../backend/api/index.js');
  app = backendApp.default;
} catch (error) {
  // If import fails, create a minimal error-reporting app
  console.error('Failed to load backend:', error);
  app = express();
  app.use((req, res) => {
    res.status(500).json({
      error: 'Backend initialization failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
}

// Vercel expects the default export to be the Express app
export default app;

// Also export the config for Vercel
export const config = {
  api: {
    bodyParser: false, // Let Express handle body parsing
  },
};
