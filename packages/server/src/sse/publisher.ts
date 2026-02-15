import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Separate Redis client dedicated to Pub/Sub publishing.
// Do NOT reuse the cache client — ioredis requires separate connections for Pub/Sub.
let publisher: Redis | null = null;

export function getPublisherClient(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
    });

    publisher.on('connect', () => console.log('📡 Redis publisher connected'));
    publisher.on('error', (err) => console.error('❌ Redis publisher error:', err));
  }
  return publisher;
}

export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
    console.log('📡 Redis publisher closed');
  }
}

// ---------------------------------------------------------------------------
// Publish helpers
// ---------------------------------------------------------------------------

function channelFor(environmentKey: string): string {
  return `flag-updates:${environmentKey}`;
}

export async function publishFlagUpdate(
  environmentKey: string,
  flagKey: string,
  flag: unknown,
): Promise<void> {
  const client = getPublisherClient();
  const channel = channelFor(environmentKey);
  const message = JSON.stringify({
    type: 'flag.updated',
    data: { key: flagKey, flag: JSON.stringify(flag) },
  });
  await client.publish(channel, message);
}

export async function publishSegmentUpdate(
  environmentKey: string,
  segmentKey: string,
  segment: unknown,
): Promise<void> {
  const client = getPublisherClient();
  const channel = channelFor(environmentKey);
  const message = JSON.stringify({
    type: 'segment.updated',
    data: { key: segmentKey, segment: JSON.stringify(segment) },
  });
  await client.publish(channel, message);
}
