import express, { type Express } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import apiRouter from './routes/index.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { getRedisClient } from './config/redis.js';

const app: Express = express();

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Health check (no auth) — legacy endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Liveness probe — process is running
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe — dependencies are connected
app.get('/readyz', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redis = getRedisClient();
  const redisReady = redis.status === 'ready';

  const status = mongoReady && redisReady ? 200 : 503;
  res.status(status).json({
    status: status === 200 ? 'ok' : 'unavailable',
    checks: {
      mongo: mongoReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'disconnected',
    },
  });
});

// API v1 routes
app.use('/api/v1', apiRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
