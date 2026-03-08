# Architecture

**Analysis Date:** 2026-03-08

## Pattern Overview

**Overall:** Monorepo with shared evaluation engine, REST API server, React SPA dashboard, and Node.js SDK

**Key Characteristics:**
- Shared evaluation logic in `@featuregate/evaluator` consumed by both server and SDK -- single source of truth
- Project/environment scoping: Flags and segments are defined at project level; targeting config is per-environment via separate `FlagConfig`/`SegmentConfig` documents
- Two authentication paths: JWT Bearer tokens for dashboard users, `X-API-Key` header for SDK clients
- Real-time updates via Redis Pub/Sub broadcasting to SSE connections
- Redis cache layer with TTLs sits between API routes and MongoDB

## Layers

**Evaluator (Pure Logic):**
- Purpose: Deterministic flag evaluation engine with zero external dependencies
- Location: `packages/evaluator/src/`
- Contains: Evaluation algorithm (`evaluate.ts`), clause matching (`clauses.ts`), segment membership (`segments.ts`), consistent hashing (`hash.ts`), type definitions (`types.ts`)
- Depends on: Nothing (pure functions only)
- Used by: `@featuregate/server` (SDK routes, flag routes), `@featuregate/node-sdk` (client-side evaluation)

**Server (API Layer):**
- Purpose: Express REST API providing CRUD operations, flag evaluation endpoints, SSE streaming, and audit logging
- Location: `packages/server/src/`
- Contains: Routes, Mongoose models, middleware, services, SSE broadcasting, config
- Depends on: `@featuregate/evaluator`, MongoDB (via Mongoose), Redis (via ioredis)
- Used by: Dashboard (via REST), SDK (via REST + SSE)

**Dashboard (Presentation Layer):**
- Purpose: React SPA for managing flags, segments, audit logs, and settings
- Location: `packages/dashboard/src/`
- Contains: Pages, components (shadcn/ui), hooks, API client, providers, layouts
- Depends on: Server REST API
- Used by: End users (browser)

**SDK (Client Library):**
- Purpose: Published npm package for application integration -- caches flags in-memory, evaluates locally
- Location: `packages/sdk-node/src/`
- Contains: Client class, in-memory flag/segment store, HTTP client, transport layer (SSE + polling)
- Depends on: `@featuregate/evaluator`, Server REST + SSE endpoints
- Used by: Consumer applications

**Website (Marketing/Landing):**
- Purpose: Static marketing website
- Location: `packages/website/src/`
- Contains: Minimal React app
- Depends on: Nothing
- Used by: Public visitors

## Data Flow

**Flag Evaluation (SDK - Local):**

1. SDK client calls `init()` which fetches all flags+segments via `GET /api/v1/sdk/flags` (authenticated by `X-API-Key`)
2. `FlagStore` (`packages/sdk-node/src/store.ts`) stores flags and segments in `Map<string, Flag>` and `Map<string, Segment>`
3. `TransportManager` starts SSE connection to `GET /api/v1/sdk/stream` for real-time incremental updates
4. On `client.isEnabled(flagKey, context)`, the SDK calls `evaluate()` from `@featuregate/evaluator` locally -- zero network latency
5. On flag/segment changes, SSE pushes `flag.updated`/`segment.updated` events; store is updated incrementally via `upsertFlag()`/`upsertSegment()`

**Flag Evaluation (Server-Side):**

1. Client sends `POST /api/v1/sdk/evaluate` with `{ flagKey, context }` (SDK key auth)
2. `loadEnvData()` in `packages/server/src/routes/sdk.ts` loads flags+configs+segments from MongoDB, merges project-level definitions with per-environment configs
3. `toEvalFlag()` and `toEvalSegment()` transformers in `packages/server/src/utils/transformers.ts` convert Mongoose documents to evaluator types
4. `evaluate()` from `@featuregate/evaluator` runs the evaluation
5. Result with value, variationIndex, and reason is returned

**Flag Mutation (Dashboard):**

1. Dashboard sends CRUD request (e.g., `PATCH /api/v1/flags/:key`) with JWT auth
2. Route handler in `packages/server/src/routes/flags.ts` validates input via Zod schema, updates MongoDB
3. `invalidateFlagCache()` in `packages/server/src/services/cacheService.ts` deletes relevant Redis keys
4. `publishFlagUpdate()` in `packages/server/src/sse/publisher.ts` publishes to Redis Pub/Sub channel `flag-updates:{envKey}`
5. `createAuditEntry()` in `packages/server/src/services/auditService.ts` writes before/after diff to AuditLog collection (fire-and-forget)
6. SSE stream handler in `packages/server/src/sse/stream.ts` receives Pub/Sub message and forwards to connected SDK clients

**State Management (Dashboard):**
- Server state managed by TanStack Query (`@tanstack/react-query`) with cache invalidation on mutations
- Project/environment selection stored in `localStorage` (`fg_project_id`, `fg_env_key`) and provided via `ProjectProvider` context (`packages/dashboard/src/providers/project-provider.tsx`)
- Auth tokens stored in `localStorage` (`fg_token`, `fg_user`) and provided via `AuthProvider` context (`packages/dashboard/src/hooks/use-auth.tsx`)

## Key Abstractions

**Flag / FlagConfig Split:**
- Purpose: Separate project-level flag definitions (key, name, variations) from per-environment targeting config (enabled, rules, targets)
- Project-level: `packages/server/src/models/Flag.ts` -- immutable key, variations, tags
- Per-environment: `packages/server/src/models/FlagConfig.ts` -- enabled state, offVariation, fallthrough, targets, rules
- Pattern: When creating a flag, a `FlagConfig` is created for every environment in the project. When reading, project-level and per-env data are merged.

**Segment / SegmentConfig Split:**
- Purpose: Same pattern as flags -- project-level segment definition, per-environment targeting
- Project-level: `packages/server/src/models/Segment.ts` -- key, name, tags
- Per-environment: `packages/server/src/models/SegmentConfig.ts` -- included/excluded lists, rules
- Pattern: Mirrors the Flag/FlagConfig pattern exactly

**Evaluator Types (Canonical):**
- Purpose: Define the shape of data the evaluation engine operates on
- Location: `packages/evaluator/src/types.ts`
- Key types: `Flag`, `Segment`, `EvaluationContext`, `EvaluationResult`, `Clause`, `Rule`, `Rollout`, `Operator`
- Pattern: Mongoose documents are transformed to these types via `toEvalFlag()`/`toEvalSegment()` in `packages/server/src/utils/transformers.ts`

**Transformer Layer:**
- Purpose: Convert between Mongoose document shapes (with ObjectIds, nested rollouts) and evaluator types
- Location: `packages/server/src/utils/transformers.ts`
- Key functions: `toEvalFlag()`, `toEvalSegment()`, `buildSegmentIdToKeyMap()`
- Pattern: Handles `segmentMatch` attribute conversion (ObjectId to `segment:{key}` format)

**Cache Service:**
- Purpose: Redis cache layer with typed key builders and TTLs
- Location: `packages/server/src/services/cacheService.ts`
- Key prefix: `fg:` (auto-added by ioredis)
- TTLs: FLAG=60s, FLAGS_ALL=60s, SDK_KEY=300s, SDK_PAYLOAD=60s
- Pattern: Read-through (check cache, miss to DB, write back). Invalidation on mutations cascades (flag change invalidates flag, all-flags, and SDK payload keys).

**FlagStore (SDK):**
- Purpose: In-memory cache of flag/segment definitions for zero-latency evaluation
- Location: `packages/sdk-node/src/store.ts`
- Pattern: `Map<string, Flag>` and `Map<string, Segment>`. Bulk replace on init, incremental upsert on SSE updates.

## Entry Points

**Server:**
- Location: `packages/server/src/index.ts`
- Triggers: `pnpm -F @featuregate/server dev` or `node dist/index.js`
- Responsibilities: Loads env vars (dotenv), connects MongoDB, verifies Redis, starts Express on `PORT` (default 4000)
- App setup: `packages/server/src/app.ts` -- CORS, JSON body parsing, health check route, mounts `/api/v1` router, global error handler

**Dashboard:**
- Location: `packages/dashboard/src/main.tsx`
- Triggers: `pnpm -F @featuregate/dashboard dev` (Vite dev server)
- Responsibilities: Renders React app with `QueryProvider > AuthProvider > ErrorBoundary > RouterProvider`

**SDK:**
- Location: `packages/sdk-node/src/index.ts`
- Triggers: `import { FeatureGateClient } from '@featuregate/node-sdk'`
- Responsibilities: Exports `FeatureGateClient` class, `FlagStore`, transport classes, and all types

**Evaluator:**
- Location: `packages/evaluator/src/index.ts`
- Triggers: `import { evaluate } from '@featuregate/evaluator'`
- Responsibilities: Exports `evaluate()`, `matchClause()`, `isUserInSegment()`, `hashUser()`, `bucketUser()`, and all types

## Error Handling

**Strategy:** Centralized error middleware with typed error classes

**Patterns:**
- Custom error hierarchy in `packages/server/src/utils/errors.ts`: `AppError` (base) > `NotFoundError` (404), `ValidationError` (400), `UnauthorizedError` (401), `ConflictError` (409), `ForbiddenError` (403)
- All route handlers use `try/catch` with `next(error)` delegation
- Global error handler in `packages/server/src/middleware/errorHandler.ts` catches: Zod validation errors, AppError subclasses, Mongoose validation errors, MongoDB duplicate key errors (11000), and unhandled errors (500)
- SDK evaluation methods never throw -- return default values on error with `reason: 'ERROR'`
- Dashboard API client in `packages/dashboard/src/api/client.ts` throws `ApiError` with status code; auto-redirects to `/login` on 401

**Validation:**
- Zod schemas defined inline in route files (e.g., `packages/server/src/routes/flags.ts`)
- `validateBody()` and `validateQuery()` middleware in `packages/server/src/middleware/validate.ts` parse and replace `req.body`/`req.query`

## Cross-Cutting Concerns

**Logging:** Console-based (`console.log`, `console.error`). SDK accepts optional `Logger` interface for structured logging.

**Validation:** Zod schemas in each route file. Middleware in `packages/server/src/middleware/validate.ts` wraps Zod parsing into Express middleware. Schemas co-located with routes, not centralized.

**Authentication:**
- Dashboard: JWT via `authenticateDashboard()` in `packages/server/src/middleware/auth.ts`. Attaches `req.user` with `_id`, `email`, `role`.
- SDK: API key via `authenticateSDK()` in same file. Looks up `Environment` by `sdkKey`, attaches `req.environment` with `_id`, `key`, `projectId`, `sdkKey`. SDK key lookups are cached in Redis (300s TTL).
- JWT signing: `signJwt()` in same file, 24h expiration.

**Authorization:**
- Role-based access control via `requireProjectRole()` middleware in `packages/server/src/middleware/rbac.ts`
- Project-scoped roles: `owner` (40) > `admin` (30) > `developer` (20) > `viewer` (10)
- Global `admin` role bypasses project-level checks
- Role membership stored in `TeamMember` model

**Audit Logging:**
- Fire-and-forget via `createAuditEntry()` in `packages/server/src/services/auditService.ts`
- Computes shallow diff between previous and current values
- Stores action, resourceType, resourceKey, projectId, environmentKey, author, previousValue, currentValue, diff

**Real-Time Updates:**
- Redis Pub/Sub channel per environment: `flag-updates:{environmentKey}`
- Publisher: `packages/server/src/sse/publisher.ts` -- separate Redis connection for Pub/Sub
- SSE stream: `packages/server/src/sse/stream.ts` -- per-connection subscriber via `publisher.duplicate()`
- Heartbeat every 30s to keep connections alive through proxies

---

*Architecture analysis: 2026-03-08*
