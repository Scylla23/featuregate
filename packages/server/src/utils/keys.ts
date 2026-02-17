import crypto from 'crypto';

export function generateSdkKey(): string {
  return `sdk-${crypto.randomBytes(32).toString('hex')}`;
}

export function generateMobileKey(): string {
  return `mob-${crypto.randomBytes(32).toString('hex')}`;
}

export function generateClientSideId(): string {
  return crypto.randomBytes(12).toString('hex');
}

const API_KEY_PREFIXES: Record<string, string> = {
  server: 'fg_srv_',
  client: 'fg_cli_',
  mobile: 'fg_mob_',
};

export function generateApiKey(keyType: string): {
  fullKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const prefix = API_KEY_PREFIXES[keyType] || 'fg_';
  const random = crypto.randomBytes(24).toString('hex');
  const fullKey = `${prefix}${random}`;
  const keyPrefix = fullKey.slice(0, prefix.length + 4) + '...';
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, keyPrefix, keyHash };
}
