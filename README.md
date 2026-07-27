<p align="center">
  <img src="/assets/featuregate-logo.svg" alt="FeatureGate" width="64" height="64" />
</p>

<h1 align="center">FeatureGate</h1>

<p align="center">
  <strong>Self-hosted feature flags with segments, targeting rules, and a Node.js SDK.</strong>
  <br />
  An open-source alternative to LaunchDarkly — built for teams that want control without the cost.
</p>

<p align="center">
  <a href="http://featuregate.online/#">Website</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#sdk-usage">SDK</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deploy</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/pavankushnure/featuregate/actions"><img src="https://img.shields.io/github/actions/workflow/status/pavankushnure/featuregate/ci.yml?branch=main&style=flat-square" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@featuregate/node-sdk"><img src="https://img.shields.io/npm/v/@featuregate/node-sdk?style=flat-square&color=6C3FE8" alt="npm" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://hub.docker.com/r/pavankushnure/featuregate"><img src="https://img.shields.io/docker/pulls/pavankushnure/featuregate?style=flat-square" alt="Docker Pulls" /></a>
</p>

<br />

<!-- TODO: Replace with actual screenshot -->
<p align="center">
  <img src="docs/assets/dashboard-screenshot.png" alt="FeatureGate Dashboard" width="800" />
</p>

---

## Why FeatureGate?

Feature flags shouldn't cost $10/seat/month or require a PhD to self-host. FeatureGate gives you the targeting power of LaunchDarkly — segments, multi-clause rules, percentage rollouts, multivariate flags — in a lightweight, self-hosted package that you can deploy with a single `docker compose up`.

**Built for small teams and indie hackers** who want progressive delivery without enterprise pricing.

### Comparison

| Feature | FeatureGate | LaunchDarkly | Unleash | Flipt |
|---|---|---|---|---|
| Self-hosted | ✅ | ❌ (SaaS only) | ✅ | ✅ |
| Segments & targeting rules | ✅ | ✅ | Partial | Partial |
| Percentage rollouts | ✅ (consistent hashing) | ✅ | ✅ | ✅ |
| Multivariate flags | ✅ (any JSON type) | ✅ | ❌ | ✅ |
| Real-time updates | ✅ (SSE) | ✅ (SSE) | Polling | SSE |
| Node.js SDK | ✅ | ✅ | ✅ | ✅ |
| Server-side evaluation | ✅ (<10ms) | ✅ | ✅ | ✅ |
| Management dashboard | ✅ | ✅ | ✅ | Partial |
| Audit log | ✅ | ✅ | ✅ | Git history |
| Setup complexity | `docker compose up` | Managed SaaS | Moderate | Low |
| Cost | **Free** | From $10.50/seat/mo | Free (OSS) / Paid | Free (OSS) / Paid |
| Primary language | Node.js / TypeScript | Multi-language | Node.js | Go |

---

## Features

### 🚩 Feature Flags
Create boolean or multivariate flags with any JSON variation value. Toggle flags on/off instantly. Set a default "off" variation and a fallthrough rule for when targeting is on but no rules match.

### 🎯 Segments & Targeting Rules
Define reusable user segments with rule-based membership (e.g., "plan is enterprise AND country is US") or explicit include/exclude lists. Target segments across multiple flags — manage your audience in one place. Rules support 22+ operators including `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `matches`, `greaterThan`, `lessThan`, `equals`, `notEquals`, `semverEquals`, `semverGreaterThan`, `semverLessThan`, `before`, `after`, `exists`, `notExists`, and `segmentMatch`.

### 📊 Percentage Rollouts
Gradually roll out features to a percentage of users using consistent hashing (MurmurHash). The same user always gets the same variation — no flickering. Roll out by user ID, company ID, or any custom attribute.

### ⚡ Real-Time Propagation
Flag changes propagate to all connected SDKs within milliseconds via Server-Sent Events (SSE) and Redis Pub/Sub. No polling delay, no stale flags.

### 📦 Node.js SDK
Published on npm. Initialize once, evaluate flags locally in-memory with zero network latency per check. Automatic reconnection and polling fallback if SSE disconnects.

### 📋 Audit Log
Every flag and segment change is logged with who changed what, when, and a full diff of before/after state.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10.7.0
- [Docker](https://docs.docker.com/get-docker/) (for MongoDB + Redis)

### 1. Clone and install

```bash
git clone https://github.com/pavankushnure/featuregate.git
cd featuregate
pnpm install
```

### 2. Start infrastructure

```bash
pnpm docker:up   # Starts MongoDB + Redis containers
```

### 3. Seed demo data

```bash
pnpm -F @featuregate/server run seed
```

### 4. Start development servers

```bash
pnpm dev   # Starts API server (port 4000) + Dashboard (port 3000)
```

### 5. Open the dashboard

Navigate to [http://localhost:3000](http://localhost:3000).

Login with: `admin@featuregate.io` / `password123`

### 6. Install the SDK (coming soon)

```bash
npm install @featuregate/node-sdk
```

### 7. Evaluate your first flag

```typescript
import { FeatureGateClient } from '@featuregate/node-sdk';

const client = new FeatureGateClient({
  sdkKey: 'sdk-dev-xxxxx', // shown in dashboard Settings
  baseUrl: 'http://localhost:4000',
});

await client.waitForInitialization();

const showNewCheckout = client.isEnabled('new-checkout', {
  key: 'user-123',
  email: 'john@acme.com',
  plan: 'enterprise',
  country: 'US',
});

console.log('New checkout enabled:', showNewCheckout);
```

The SDK caches all flag data in memory and evaluates locally — no network call per flag check.

---

## SDK Usage

> **Note**: The Node.js SDK is under active development. The examples below show the planned API interface.

### Initialization

```typescript
import { FeatureGateClient } from '@featuregate/node-sdk';

const client = new FeatureGateClient({
  sdkKey: 'sdk-prod-xxxxx',
  baseUrl: 'https://your-featuregate-instance.com',
  pollingInterval: 30000,  // fallback polling interval (ms)
  flushInterval: 10000,    // evaluation event flush interval (ms)
});

await client.waitForInitialization();
```

### Boolean evaluation

```typescript
const enabled = client.isEnabled('feature-key', context);
// Returns: true | false
```

### Multivariate evaluation

```typescript
const variant = client.variation('checkout-theme', context, 'control');
// Returns: 'control' | 'variant-a' | 'variant-b'
```

### Evaluation with reason (debugging)

```typescript
const detail = client.variationDetail('new-checkout', context, false);
// Returns:
// {
//   value: true,
//   variationIndex: 0,
//   reason: { kind: 'RULE_MATCH', ruleIndex: 0, ruleId: 'rule-beta' }
// }
```

### All flags for a context (frontend bootstrapping)

```typescript
const allFlags = client.allFlagsState(context);
// Returns: { 'new-checkout': true, 'checkout-theme': 'variant-a', ... }
```

### Listen for flag changes

```typescript
client.on('update', (flagKey) => {
  console.log(`Flag ${flagKey} updated — re-evaluate if needed`);
});

client.on('ready', () => console.log('SDK initialized'));
client.on('error', (err) => console.error('SDK error:', err));
```

### Context object

The context object represents the entity you're evaluating the flag for. The only required field is `key` (a unique identifier). All other fields are custom attributes used by your targeting rules.

```typescript
const context = {
  key: 'user-123',        // required: unique user/entity ID
  email: 'john@acme.com', // custom attribute
  plan: 'enterprise',     // custom attribute
  country: 'US',          // custom attribute
  betaOptIn: true,         // custom attribute
  appVersion: '2.1.0',    // custom attribute (for semver operators)
};
```

### Cleanup

```typescript
client.close(); // closes SSE connection and flushes pending events
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEATUREGATE ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

  ┌───────────────┐    REST API     ┌────────────────────┐
  │  React         │ <──────────── > │   Node.js/Express   │
  │  Dashboard     │    SSE         │   API Server         │
  │  (Tailwind +   │               │                      │
  │   shadcn/ui)   │               │                      │
  └───────────────┘                └─────────┬────────────┘
                                             │
                                ┌────────────┼────────────┐
                                │                         │
                         ┌──────┴──────┐           ┌──────┴──────┐
                         │  MongoDB     │           │  Redis       │
                         │  (primary    │           │  (cache +    │
                         │   store)     │           │   pub/sub)   │
                         └─────────────┘           └─────────────┘

  ┌──────────────────────────────────────────────────┐
  │  Your Application                                 │
  │  ┌──────────────────────────────────────────────┐ │
  │  │  @featuregate/node-sdk                        │ │
  │  │  • In-memory flag & segment cache             │ │
  │  │  • SSE listener for real-time updates         │ │
  │  │  • Local evaluation engine (shared package)   │ │
  │  │  • sdk.isEnabled('flag', { user context })    │ │
  │  └──────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────┘
```

### How flag evaluation works

1. **SDK initializes** — fetches all flag + segment data and caches in memory.
2. **SDK opens SSE connection** — receives real-time `flag.updated` and `segment.updated` events.
3. **App calls `sdk.isEnabled()`** — evaluates locally against the in-memory cache. No network call. Returns in <1ms.
4. **Flag updated in dashboard** — API writes to MongoDB, invalidates Redis cache, publishes to Redis Pub/Sub.
5. **SSE broadcasts the change** — all connected SDKs update their cache within milliseconds.

### Evaluation order

The evaluation engine follows the same hierarchy as LaunchDarkly:

```
Flag OFF?  ──yes──▶  Return offVariation (reason: OFF)
   │ no
   ▼
Individual target match?  ──yes──▶  Return targeted variation (reason: TARGET_MATCH)
   │ no
   ▼
Targeting rules (top → bottom)
   │
   ├── Rule 1: all clauses match?  ──yes──▶  Return rule's rollout (reason: RULE_MATCH)
   ├── Rule 2: all clauses match?  ──yes──▶  Return rule's rollout (reason: RULE_MATCH)
   └── Rule N: ...
   │ no match
   ▼
Fallthrough (default rule)  ──▶  Return fallthrough rollout (reason: FALLTHROUGH)
```

Within each rule, **all clauses must match** (AND logic). Between segment rules, **any rule can match** (OR logic). Percentage rollouts use consistent hashing (MurmurHash) so the same user always gets the same variation.

---

## Segments

Segments are reusable groups of users. Define a segment once, reference it across any number of flags.

### Creating a segment

```json
{
  "key": "beta-testers",
  "name": "Beta Testers",
  "included": ["user-42", "user-99"],
  "excluded": ["user-666"],
  "rules": [
    {
      "clauses": [
        { "attribute": "plan", "operator": "in", "values": ["enterprise"] },
        { "attribute": "betaOptIn", "operator": "in", "values": [true] }
      ]
    },
    {
      "clauses": [
        { "attribute": "email", "operator": "endsWith", "values": ["@yourcompany.com"] }
      ]
    }
  ]
}
```

This segment includes:
- `user-42` and `user-99` (always in, via explicit include list)
- Any enterprise user who opted into beta (rule 1)
- Anyone with a company email (rule 2)
- `user-666` is always excluded, even if they match a rule

### Using a segment in a flag rule

```json
{
  "clauses": [
    { "attribute": "segmentMatch", "operator": "in", "values": ["beta-testers"] }
  ],
  "rollout": { "variation": 0 }
}
```

---

## API Reference

All endpoints are prefixed with `/api/v1`. Authentication via `X-API-Key` header (SDK endpoints) or JWT Bearer token (dashboard endpoints).

### Flags

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/flags` | Create a feature flag |
| `GET` | `/flags` | List flags (paginated, searchable) |
| `GET` | `/flags/:key` | Get a flag by key |
| `PATCH` | `/flags/:key` | Update a flag |
| `PATCH` | `/flags/:key/toggle` | Toggle flag on/off |
| `DELETE` | `/flags/:key` | Archive a flag |

### Segments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/segments` | Create a segment |
| `GET` | `/segments` | List segments |
| `GET` | `/segments/:key` | Get a segment by key |
| `PATCH` | `/segments/:key` | Update a segment |
| `DELETE` | `/segments/:key` | Archive a segment |
| `POST` | `/segments/:key/check` | Check if a context is in this segment |
| `GET` | `/segments/:key/flags` | List flags referencing this segment |

### SDK Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sdk/flags` | Get all flags + segments (SDK init) |
| `POST` | `/sdk/evaluate` | Evaluate a single flag server-side |
| `POST` | `/sdk/evaluate/batch` | Evaluate multiple flags |
| `GET` | `/sdk/stream` | SSE stream for real-time updates |

### Audit Log

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/audit-log` | List audit events (filterable) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Server | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Cache & Pub/Sub | Redis (ioredis) |
| Dashboard | React 18, Vite 5, Tailwind CSS, shadcn/ui, TanStack Query, dnd-kit |
| SDK | TypeScript, EventSource (SSE), MurmurHash |
| Testing | Jest, Supertest |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## Project Structure

```
featuregate/
├── packages/
│   ├── evaluator/       # Shared flag evaluation engine
│   │   └── src/
│   │       ├── evaluate.ts
│   │       ├── clauses.ts
│   │       ├── segments.ts
│   │       └── hash.ts
│   ├── server/          # Express API server
│   │   └── src/
│   │       ├── routes/
│   │       ├── models/
│   │       ├── services/
│   │       ├── middleware/
│   │       └── sse/
│   ├── dashboard/       # React frontend
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── api/
│   │       ├── providers/
│   │       └── layouts/
│   └── sdk-node/        # Published npm SDK
│       └── src/
│           ├── client.ts
│           ├── store.ts
│           └── sse.ts
├── docker-compose.yaml
└── README.md
```

The evaluation engine is a **shared package** imported by both the server and the SDK — identical evaluation logic in both places, maintained once.

---

## Deployment

### Development (Docker Compose)

The local development setup uses Docker for MongoDB and Redis, with the server and dashboard running natively via Node.js:

```bash
pnpm docker:up                          # Start MongoDB + Redis
pnpm -F @featuregate/server run seed    # Seed demo data
pnpm dev                                # Start server + dashboard
```

### Production (Coming Soon)

Production Dockerfiles and deployment configurations are planned. The target infrastructure includes:
- **Multi-stage Docker builds** for server (Node.js alpine) and dashboard (Nginx)
- **GitHub Actions CI/CD** with staging/production environment promotion
- **Terraform IaC** for AWS (ECS Fargate) or GCP (Cloud Run)

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/featuregate` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | API server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | Secret for dashboard auth tokens | `dev-secret-change-in-production` |

---

## Development

```bash
# Clone the repo
git clone https://github.com/pavankushnure/featuregate.git
cd featuregate

# Install dependencies
pnpm install

# Start MongoDB and Redis
pnpm docker:up

# Seed the database with demo data
pnpm -F @featuregate/server run seed

# Start all packages (server + dashboard) via Turbo
pnpm dev

# Or start individually:
pnpm -F @featuregate/server dev       # API server (port 4000)
pnpm -F @featuregate/dashboard dev    # Dashboard (port 3000)
```

### Running tests

```bash
# Run all tests
pnpm test

# Run evaluator tests (the core algorithm)
pnpm -F @featuregate/evaluator test

# Run API integration tests
pnpm -F @featuregate/server test
```

---

## Roadmap

- [x] Core evaluation engine with 22+ operators
- [x] Segments with rule-based targeting (server-side)
- [x] Percentage rollouts (consistent hashing)
- [x] Real-time SSE propagation (server-side)
- [x] REST API (flags, segments, audit log, SDK endpoints)
- [x] JWT + SDK key authentication
- [x] Redis caching with TTLs
- [x] Dashboard: Auth (login/register)
- [x] Dashboard: Flags list with search, pagination, filtering
- [ ] Dashboard: Flag detail with targeting rule builder
- [ ] Dashboard: Segments management UI
- [ ] Dashboard: Audit log viewer
- [ ] Dashboard: Settings page
- [ ] Node.js SDK implementation
- [ ] Dockerfiles (server + dashboard)
- [ ] CI/CD with GitHub Actions
- [ ] Scheduled flag changes (turn on/off at a specific time)
- [ ] Flag lifecycle management (stale flag detection)
- [ ] React SDK for client-side evaluation
- [ ] Python SDK
- [ ] OpenFeature provider
- [ ] A/B experimentation with event tracking
- [ ] RBAC and team management
- [ ] Webhook notifications on flag changes

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Good first issues

Look for issues labeled [`good first issue`](https://github.com/pavankushnure/featuregate/labels/good%20first%20issue):

- Add Discord/Slack notification channel for flag changes
- Add CSV import for segment include/exclude lists
- Add dark mode to the dashboard
- Add flag usage analytics (evaluation counts over time)
- Add Python or Go SDK

---

## License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  Built by <a href="https://portfolio.scylla23.xyz/">Pavan Kushnure</a>
  <br />
  <sub>If this is useful, a ⭐ on the repo goes a long way.</sub>
</p>
