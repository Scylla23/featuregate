import 'dotenv/config';
import express from 'express';

import { connectDatabase } from './config/database.js';
import { getRedisClient } from './config/redis.js';
import apiRouter from './routes/index.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const app = express();
const port = parseInt(process.env.PORT || '4000', 10);

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

// Bootstrap and start
async function bootstrap() {
  await connectDatabase();

  const redis = getRedisClient();
  await redis.set('health', 'ok');
  console.log('Redis test:', await redis.get('health'));
}

bootstrap()
  .then(() => {
    app.listen(port, () => {
      console.log(`API Server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to bootstrap:', err);
    process.exit(1);
  });
