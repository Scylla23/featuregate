import express from 'express';
import { evaluate } from '@featuregate/evaluator';

import { connectDatabase } from './config/database.js';
import { getRedisClient } from './config/redis.js';

async function bootstrap() {
  await connectDatabase();
  const redis = getRedisClient();
  await redis.set('health', 'ok');
  console.log('Redis test:', await redis.get('health'));
}
bootstrap();

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const result = evaluate(); // Returns "evaluator works"
  res.send(`Server says: ${result}`);
});

app.listen(port, () => {
  console.log(`API Server running on http://localhost:${port}`);
});
