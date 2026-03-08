# Coding Conventions

**Analysis Date:** 2026-03-08

## Naming Patterns

**Files:**
- Use `kebab-case` for all file names: `cache-service.ts`, `use-flags.ts`, `error-handler.ts`
- Exception: Mongoose models use `PascalCase`: `Flag.ts`, `Segment.ts`, `AuditLog.ts`, `FlagConfig.ts`
- Test files use `.test.ts` suffix: `evaluate.test.ts`, `clauses.test.ts`
- Test helpers use plain names: `helpers.ts`, `utils.ts`

**Functions:**
- Use `camelCase` for all functions: `matchClause()`, `hashUser()`, `bucketUser()`, `evaluateFlag()`
- Prefix boolean-returning functions with `is`/`has`/`match`: `isUserInSegment()`, `matchClause()`
- React hooks prefix with `use`: `useFlags()`, `useToggleFlag()`, `useProject()`
- Express middleware uses `verbNoun` pattern: `authenticateDashboard()`, `authenticateSDK()`, `validateBody()`

**Variables:**
- Use `camelCase`: `authToken`, `sdkKey`, `environmentKey`, `flagConfig`
- Constants use `SCREAMING_SNAKE_CASE`: `MAX_SEGMENT_DEPTH`, `JWT_SECRET`
- Object constant maps use `camelCase` keys: `const TTL = { FLAG: 60, FLAGS_ALL: 60 }`
- Prefix unused parameters with underscore: `_req`, `_res`, `_next`, `_err`

**Types/Interfaces:**
- Use `PascalCase` for types and interfaces: `EvaluationContext`, `EvaluationResult`, `FlagWithConfig`
- Union types use `PascalCase` with descriptive names: `Operator`, `EvaluationReason`, `VariationValue`
- Zod schemas use `camelCase` with `Schema` suffix: `createFlagSchema`, `updateFlagSchema`, `listFlagsQuerySchema`

## Code Style

**Formatting (Prettier - `.prettierrc`):**
- Semicolons: always
- Quotes: single quotes
- Trailing commas: `all` (including function parameters)
- Print width: 100 characters
- Indent: 2 spaces
- Tab width: 2

**Linting (ESLint - `eslint.config.mjs`):**
- ESLint 10 flat config with `typescript-eslint`
- `@typescript-eslint/no-unused-vars`: warn, with `argsIgnorePattern: "^_"`
- `@typescript-eslint/no-explicit-any`: warn (not error -- some `any` exists in codebase with eslint-disable comments)
- React plugins (hooks, refresh) for dashboard/website packages only
- `eslint-config-prettier` applied last to avoid conflicts

## Import Organization

**Order:**
1. External packages (`express`, `mongoose`, `zod`, `@tanstack/react-query`)
2. Workspace packages (`@featuregate/evaluator`)
3. Internal absolute imports (`@/api/flags`, `@/providers/project-provider`)
4. Relative imports (`../models/Flag.js`, `./helpers.js`)

**Path Aliases:**
- Dashboard uses `@/*` mapped to `./src/*` (configured in `packages/dashboard/tsconfig.json`)
- Server and evaluator use relative paths with `.js` extensions (NodeNext module resolution)

**ESM Import Rules:**
- All packages use `"type": "module"` in `package.json`
- Server and evaluator imports MUST include `.js` extension: `import { evaluate } from './evaluate.js'`
- Dashboard imports do NOT use `.js` extension (Vite bundler handles resolution)
- Use `import type { ... }` for type-only imports: `import type { Segment } from '../types.js'`

## Error Handling

**Server Error Hierarchy (`packages/server/src/utils/errors.ts`):**
- `AppError` (base) - custom status code + message + optional code
- `NotFoundError(resource, identifier)` - 404, e.g., `new NotFoundError('Flag', flagKey)`
- `ValidationError(message, details?)` - 400
- `UnauthorizedError(message?)` - 401
- `ConflictError(message)` - 409
- `ForbiddenError(message?)` - 403

**Route Error Pattern:**
- Wrap all route handlers in `try/catch`
- Pass errors to `next(error)` for centralized handling
- Centralized error handler at `packages/server/src/middleware/errorHandler.ts`
- Handles: custom `AppError`, Zod `ValidationError`, Mongoose `ValidationError`, MongoDB duplicate key (11000)

```typescript
// Standard route handler pattern
router.post('/', validateBody(schema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ... business logic
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
```

**Dashboard Error Pattern (`packages/dashboard/src/api/client.ts`):**
- `ApiError` class with `status` and `details` properties
- Auto-redirect to `/login` on 401 responses
- `apiFetch<T>()` generic function auto-attaches JWT from localStorage

**Evaluator Error Pattern:**
- Pure functions that throw on unrecoverable errors (e.g., invalid semver)
- `evaluate()` wraps everything in try/catch, returns `{ reason: 'ERROR' }` as fallback
- Uses `offVariation` as the emergency fallback value

## Validation

**Server API Validation:**
- All request bodies validated with Zod schemas before route handlers
- Use `validateBody(schema)` middleware from `packages/server/src/middleware/validate.ts`
- Use `validateQuery(schema)` for query parameter validation
- Zod schemas defined inline at the top of route files (not in separate files)
- Schema naming: `createFlagSchema`, `updateFlagSchema`, `listFlagsQuerySchema`

```typescript
// Validation middleware pattern
router.post('/', validateBody(createFlagSchema), async (req, res, next) => {
  // req.body is already validated and typed
});
```

**Flag Key Validation:**
- Regex: `/^[a-z0-9][a-z0-9-]*$/` (lowercase alphanumeric with hyphens, must start with alphanumeric)

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- `console.error('Unhandled error:', err)` in global error handler
- No application-level logging middleware

## Comments

**When to Comment:**
- Section dividers in route files use ASCII art: `// ─── Section Name ───────────────`
- Route files use comment block headers: `// ---------------------------------------------------------------------------`
- JSDoc on exported utility functions (see `packages/evaluator/src/hash.ts`)
- Inline comments explain "why" not "what"

**JSDoc/TSDoc:**
- Used sparingly on key exported functions
- `@returns` and `@param` tags used in evaluator package

```typescript
/**
 * Generates a deterministic hash for a user/flag combination.
 * @returns A number between 0 and 99999 (0% to 99.999%)
 */
export function hashUser(userKey: string, salt: string): number {
```

## Function Design

**Size:** Functions are generally small (10-30 lines). Route handlers can be longer (30-60 lines) due to the request/response cycle.

**Parameters:**
- Use object destructuring for multiple parameters: `const { page, limit, search } = req.query`
- Builder functions use `overrides` pattern: `buildFlag(key, overrides)`
- Express handlers always include `(req: Request, res: Response, next: NextFunction)`

**Return Values:**
- Pure functions return typed results: `evaluate()` returns `EvaluationResult`
- Route handlers call `res.json()` or `res.status(N).json()`
- Mutations return the updated document

## Module Design

**Exports:**
- Use named exports exclusively (no default exports except Express `router` and Jest configs)
- Re-export from barrel `index.ts` files: `packages/evaluator/src/index.ts`
- Separate value exports from type exports using `export type { ... }`

**Barrel Files:**
- `packages/evaluator/src/index.ts` - re-exports all public API and types
- Route files export `default router` for Express mounting

**Express Router Pattern:**
- One router per resource: `packages/server/src/routes/flags.ts`, `segments.ts`, `sdk.ts`
- Auth middleware applied at router level: `router.use(authenticateDashboard)`
- Routes mounted in `packages/server/src/routes/index.ts`

## React/Dashboard Patterns

**Data Fetching (`packages/dashboard/src/hooks/use-flags.ts`):**
- TanStack Query hooks wrap API calls
- Query keys are descriptive arrays: `['flags', params]`, `['flag', key, environmentKey]`
- Mutations use `onSuccess` to invalidate related queries
- Optimistic updates pattern used for toggle operations (see `useToggleFlag`)

**API Client (`packages/dashboard/src/api/client.ts`):**
- Generic `apiFetch<T>(path, options)` function
- Auto-attaches JWT from `localStorage.getItem('fg_token')`
- Base URL from `VITE_API_URL` env var or defaults to `/api/v1`

**Project Scoping:**
- All data queries include `projectId` and `environmentKey` from `useProject()` hook
- Queries are disabled until project context is available: `enabled: !!params.projectId`

**Auth Tokens:**
- JWT stored as `fg_token` in localStorage
- User object stored as `fg_user` in localStorage
- Project/env persistence: `fg_project_id`, `fg_env_key`

---

*Convention analysis: 2026-03-08*
