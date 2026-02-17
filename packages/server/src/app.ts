import express, { type Express } from 'express';
import cors from 'cors';

import apiRouter from './routes/index.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const app: Express = express();

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes
app.use('/api/v1', apiRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
