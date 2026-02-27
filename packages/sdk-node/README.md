# @featuregate/node-sdk

Node.js SDK for [FeatureGate](https://github.com/your-org/featuregate) — a self-hosted feature flag platform.

Evaluates flags locally with zero network latency per check. Receives real-time updates via SSE with automatic polling fallback.

## Installation

```bash
npm install @featuregate/node-sdk
# or
pnpm add @featuregate/node-sdk
```

Requires Node.js >= 18.0.0.

## Quick Start

```typescript
import { FeatureGateClient } from '@featuregate/node-sdk';

const client = new FeatureGateClient({
  sdkKey: 'your-sdk-key',
  baseUrl: 'http://localhost:4000',
});

await client.init();

const enabled = client.isEnabled('new-checkout', { key: 'user-123', plan: 'pro' });
const variant = client.variation('banner-color', { key: 'user-123' }, 'blue');

process.on('SIGTERM', () => client.close());
```

## API

### `new FeatureGateClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sdkKey` | `string` | *required* | Environment SDK key |
| `baseUrl` | `string` | *required* | FeatureGate API server URL |
| `transport` | `'sse' \| 'polling'` | `'sse'` | Update mechanism |
| `pollingIntervalMs` | `number` | `30000` | Polling interval (ms) |
| `connectionTimeoutMs` | `number` | `10000` | Init timeout (ms) |
| `logger` | `Logger` | `undefined` | Structured logger |

### `client.init(): Promise<void>`

Fetches flags from the server and starts real-time updates. Resolves when the first data load completes. Idempotent.

### `client.isEnabled(flagKey, context, defaultValue?): boolean`

Evaluate a boolean flag. Returns `defaultValue` (default: `false`) if the flag is not found or the client is not ready.

### `client.variation(flagKey, context, defaultValue?): VariationValue | null`

Evaluate a flag and return its variation value (string, number, boolean, object, or array).

### `client.variationDetail(flagKey, context, defaultValue?): EvaluationDetail`

Evaluate a flag with full detail:

```typescript
interface EvaluationDetail {
  value: VariationValue;
  variationIndex: number;
  reason: 'FLAG_DISABLED' | 'INDIVIDUAL_TARGET' | 'RULE_MATCH' | 'ROLLOUT' | 'DEFAULT' | 'DEFAULT_ROLLOUT' | 'ERROR';
  ruleIndex?: number;
  ruleId?: string;
}
```

### `client.allFlagsState(context): Record<string, VariationValue>`

Evaluate all flags for a context. Returns a map of flag key to value.

### `client.close(): Promise<void>`

Stop all connections and clean up. Idempotent.

## Events

```typescript
client.on('ready', () => {
  console.log('Flags loaded');
});

client.on('change', ({ flagKey }) => {
  console.log(`Flag updated: ${flagKey}`);
});

client.on('update', ({ flags }) => {
  console.log(`Bulk update: ${flags.length} flags`);
});

client.on('error', (err) => {
  console.error('SDK error:', err);
});

client.on('transport:fallback', () => {
  console.warn('Fell back to polling');
});

client.on('transport:restored', () => {
  console.info('SSE connection restored');
});
```

## Context

The evaluation context identifies the user/entity being evaluated:

```typescript
const context = {
  key: 'user-123',        // Required: unique identifier
  email: 'user@example.com',
  plan: 'enterprise',
  country: 'US',
  version: '2.1.0',
};
```

## License

MIT
