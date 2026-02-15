import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton instance
let redis: Redis;

export const getRedisClient = (): Redis => {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      keyPrefix: 'fg:', // Essential for multi-tenant or shared Redis instances
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null, // Critical for keeping the app alive during outages
    });

    redis.on('connect', () => console.log('🔴 Redis connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err));
  }
  return redis;
};

export const closeRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    console.log('🔴 Redis connection closed');
  }
};
