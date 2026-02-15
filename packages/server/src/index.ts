import 'dotenv/config';

import app from './app.js';
import { connectDatabase } from './config/database.js';
import { getRedisClient } from './config/redis.js';

const port = parseInt(process.env.PORT || '4000', 10);

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
