import { getRedisClient } from '../config/redis.js';

// The ioredis client has keyPrefix: 'fg:' configured.
// All keys passed to get/set/del are auto-prefixed with 'fg:'.
// PUBLISH/SUBSCRIBE channels are NOT auto-prefixed — we prefix manually.

const TTL = {
  FLAG: 60,
  FLAGS_ALL: 60,
  SDK_KEY: 300,
  SDK_PAYLOAD: 60,
} as const;

// --- Key builders (without fg: prefix, ioredis adds it) ---

const keys = {
  flag: (envKey: string, flagKey: string) => `flag:${envKey}:${flagKey}`,
  flagsAll: (envKey: string) => `flags-all:${envKey}`,
  sdkKey: (sdkKey: string) => `sdkkey:${sdkKey}`,
  sdkPayload: (envKey: string) => `sdk-payload:${envKey}`,
};

// --- Generic helpers ---

async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

async function setCache(key: string, value: unknown, ttl: number): Promise<void> {
  const redis = getRedisClient();
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
}

async function deleteCache(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

// --- Flag cache ---

export async function getCachedFlag(envKey: string, flagKey: string): Promise<unknown | null> {
  return getCache(keys.flag(envKey, flagKey));
}

export async function setCachedFlag(envKey: string, flagKey: string, data: unknown): Promise<void> {
  await setCache(keys.flag(envKey, flagKey), data, TTL.FLAG);
}

export async function invalidateFlagCache(envKey: string, flagKey: string): Promise<void> {
  await Promise.all([
    deleteCache(keys.flag(envKey, flagKey)),
    deleteCache(keys.flagsAll(envKey)),
    deleteCache(keys.sdkPayload(envKey)),
  ]);
}

// --- Segment cache (invalidates flag caches too since flags reference segments) ---

export async function invalidateSegmentCache(envKey: string): Promise<void> {
  await Promise.all([
    deleteCache(keys.flagsAll(envKey)),
    deleteCache(keys.sdkPayload(envKey)),
  ]);
}

// --- SDK key cache ---

export async function getCachedSdkKey<T>(sdkKey: string): Promise<T | null> {
  return getCache<T>(keys.sdkKey(sdkKey));
}

export async function setCachedSdkKey(sdkKey: string, envData: unknown): Promise<void> {
  await setCache(keys.sdkKey(sdkKey), envData, TTL.SDK_KEY);
}

// --- SDK payload cache ---

export async function getCachedSdkPayload<T>(envKey: string): Promise<T | null> {
  return getCache<T>(keys.sdkPayload(envKey));
}

export async function setCachedSdkPayload(envKey: string, payload: unknown): Promise<void> {
  await setCache(keys.sdkPayload(envKey), payload, TTL.SDK_PAYLOAD);
}

// --- Pub/Sub (channel names NOT auto-prefixed by ioredis) ---

export async function publishFlagUpdate(
  envKey: string,
  flagKey: string,
  action: string,
): Promise<void> {
  const redis = getRedisClient();
  const channel = `fg:flag-updates:${envKey}`;
  const message = JSON.stringify({ type: action, flagKey, timestamp: Date.now() });
  await redis.publish(channel, message);
}

export async function publishSegmentUpdate(
  envKey: string,
  segmentKey: string,
  action: string,
): Promise<void> {
  const redis = getRedisClient();
  const channel = `fg:segment-updates:${envKey}`;
  const message = JSON.stringify({ type: action, segmentKey, timestamp: Date.now() });
  await redis.publish(channel, message);
}
