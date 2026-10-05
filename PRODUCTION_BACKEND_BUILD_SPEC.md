# Production-Grade Backend: Build Spec for an LLM

> **How to use this file:** Give this entire document to an LLM coding agent (Claude Code, Cursor, etc.) and say:
> *"Follow PRODUCTION_BACKEND_BUILD_SPEC.md exactly. Complete one phase at a time. After each phase, run the verification steps, then make the git commit using the provided message. Do not start the next phase until the current one passes verification and is committed."*

---

## 0. Rules for the LLM (read first, obey always)

1. **Work phase by phase.** Never combine phases. One phase = one logical commit (or more if a phase says so).
2. **Verify before committing.** Every phase has an *Acceptance checks* list. Run them. If anything fails, fix it first. Never commit broken code.
3. **Commit after every phase** using the exact commit message provided (adjust only if the actual work differs; if it differs, update the body so it is truthful).
4. **Commit style:** Conventional Commits. Subject line ≤ 72 chars, imperative mood. Body explains *what* and *why*, wrapped at ~72 chars. Include a `Verified:` section listing the commands you ran.
5. **Stage deliberately.** Use `git add <specific paths>` or `git add -p`. Never `git add .` blindly; check `git status` and `git diff --staged` before each commit.
6. **Never commit secrets.** `.env` must be git-ignored. Only `.env.example` is committed.
7. **TypeScript strict mode, no `any`** unless justified with a comment.
8. **No placeholder code.** Every file must be real and working. No `TODO: implement` stubs unless the phase explicitly says so.
9. **Prefer small, composable modules.** Keep SQL out of controllers. Keep business logic out of routes.
10. **Ask only if truly blocked.** Otherwise pick the default stated in this document and note the decision in the commit body.
11. After each commit, print a short summary: phase name, commit hash, files changed, and what the next phase is.

---

## 1. Tech Stack (decisions already made)

| Concern | Choice |
|---|---|
| Runtime | Node.js LTS (>= 22) |
| Language | TypeScript (strict) |
| Framework | Express 5 (native async error handling) |
| Database | PostgreSQL 16+ |
| DB access | Drizzle ORM + drizzle-kit migrations + `pg` Pool (alternatives: Kysely, Prisma. Only switch if told to) |
| Validation | zod |
| Logging | pino + pino-http |
| Auth | argon2 (password hashing), jsonwebtoken (access + refresh), rotating refresh tokens stored hashed |
| Security | helmet, cors, express-rate-limit (Redis store), hpp |
| Cache / queue | Redis, BullMQ (jobs phase) |
| Docs | OpenAPI 3 via `@asteasolutions/zod-to-openapi` + Swagger UI |
| Metrics / errors | prom-client, Sentry |
| Tests | Vitest + Supertest + Testcontainers (real Postgres) |
| Tooling | ESLint (flat config), Prettier, Husky, lint-staged, commitlint |
| Container | Docker multi-stage, docker-compose for local dev |
| CI | GitHub Actions |
| Package manager | npm (use `npm ci` in CI) |

---

## 2. Target Folder Structure

```
.
├── .github/workflows/ci.yml
├── .husky/
├── docker/
│   └── postgres-init.sql            (optional)
├── drizzle/                         (generated migrations, committed)
├── src/
│   ├── config/
│   │   ├── env.ts                   (zod-validated env)
│   │   └── constants.ts
│   ├── db/
│   │   ├── pool.ts                  (pg Pool + drizzle instance)
│   │   ├── schema/
│   │   │   ├── index.ts
│   │   │   ├── users.ts
│   │   │   └── refresh-tokens.ts
│   │   ├── transaction.ts           (withTransaction helper)
│   │   └── seed.ts                  (dev seed only)
│   ├── lib/
│   │   ├── app-error.ts
│   │   ├── logger.ts
│   │   ├── async-handler.ts         (only if needed)
│   │   ├── pagination.ts
│   │   ├── redis.ts
│   │   └── metrics.ts
│   ├── middleware/
│   │   ├── request-id.ts
│   │   ├── security.ts
│   │   ├── rate-limit.ts
│   │   ├── validate.ts
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── not-found.ts
│   │   └── error-handler.ts
│   ├── modules/
│   │   ├── health/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── token.service.ts
│   │   └── users/
│   │       ├── users.routes.ts
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       ├── users.repository.ts
│   │       └── users.schemas.ts
│   ├── jobs/                        (BullMQ queues and workers)
│   ├── docs/openapi.ts
│   ├── app.ts                       (builds the express app, no listen)
│   └── server.ts                    (boot, listen, graceful shutdown)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
├── .env.example
├── .dockerignore
├── .editorconfig
├── .gitignore
├── .nvmrc
├── commitlint.config.cjs
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── eslint.config.mjs
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
└── README.md
```

---

## 3. Phases

Each phase lists: **Goal → Tasks → Acceptance checks → Commit**.

---

### Phase 1: Repository bootstrap

**Goal:** Clean repo with baseline hygiene files.

**Tasks**
1. `git init`, set default branch to `main`.
2. Create `.gitignore` (node_modules, dist, coverage, `.env`, `.env.*` except `.env.example`, logs, `.DS_Store`, IDE folders).
3. Create `.nvmrc` with the Node LTS major version, `.editorconfig` (LF, 2 spaces, UTF-8, final newline).
4. `npm init -y`, then edit `package.json`: name, `"private": true`, `"type": "module"`, `"engines": { "node": ">=22" }`, description, license.
5. Create a minimal `README.md` (project name, one-line purpose, "setup coming soon").

**Acceptance checks**
- `git status` is clean after the commit.
- `.env` pattern is ignored (`git check-ignore .env` prints `.env`).

**Commit**
```
chore: bootstrap repository with baseline project files

Initialize the repository and add the files every project needs before
any application code exists.

- Add .gitignore covering node_modules, build output, coverage, logs,
  IDE files and all .env files except .env.example
- Add .nvmrc and package.json "engines" to pin the Node.js LTS version
  so local, CI and production runtimes match
- Add .editorconfig (LF endings, 2-space indent, UTF-8) for consistent
  formatting across editors
- Initialize package.json as a private ES-module package
- Add a minimal README placeholder

Verified:
- git check-ignore .env
- git status clean
```

---

### Phase 2: TypeScript and build pipeline

**Goal:** Strict TypeScript, fast dev loop, production build to `dist/`.

**Tasks**
1. Install deps: `typescript`, `tsx`, `@types/node`, `tsup` (or use plain `tsc`; pick one and stay consistent).
2. `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`, `moduleResolution: "NodeNext"`, `module: "NodeNext"`, `target: "ES2022"`, `sourceMap: true`, path alias `@/*` → `src/*` if desired.
3. `tsconfig.build.json` excluding tests.
4. Scripts: `dev` (`tsx watch src/server.ts`), `build`, `start` (`node dist/server.js`), `typecheck` (`tsc --noEmit`).
5. Create `src/server.ts` with a trivial `console.log` so the build has an entrypoint (replaced in Phase 6).

**Acceptance checks**
- `npm run typecheck` passes.
- `npm run build` produces `dist/server.js`.
- `npm start` runs the built file.

**Commit**
```
build: configure strict TypeScript and production build pipeline

Set up TypeScript with the strictest practical settings so type errors
are caught at compile time rather than in production.

- Add tsconfig.json with strict mode, noUncheckedIndexedAccess,
  exactOptionalPropertyTypes and NodeNext module resolution
- Add tsconfig.build.json to exclude tests from the emitted build
- Add tsx for a fast watch-mode dev loop and tsup/tsc for the build
- Add scripts: dev, build, start, typecheck
- Add a placeholder src/server.ts entrypoint (replaced when the HTTP
  server is implemented)

Production runs compiled JavaScript from dist/, never ts-node/tsx.

Verified:
- npm run typecheck
- npm run build && npm start
```

---

### Phase 3: Code quality tooling and git hooks

**Goal:** Automated lint, format and commit-message enforcement.

**Tasks**
1. Install ESLint (flat config) with `typescript-eslint`, `eslint-plugin-import` or `eslint-plugin-n` as appropriate, and Prettier + `eslint-config-prettier`.
2. Rules to include: no floating promises, no misused promises, no unused vars, consistent type imports, no `console` (use logger).
3. Install Husky, lint-staged, commitlint with `@commitlint/config-conventional`.
4. Hooks: `pre-commit` runs lint-staged (eslint --fix + prettier on staged files); `commit-msg` runs commitlint.
5. Scripts: `lint`, `lint:fix`, `format`, `format:check`.

**Acceptance checks**
- `npm run lint` and `npm run format:check` pass.
- A bad commit message (e.g. `"stuff"`) is rejected by the hook.
- A good conventional message is accepted.

**Commit**
```
chore: add ESLint, Prettier, Husky and commitlint

Enforce code quality and commit conventions automatically so standards
do not depend on reviewer vigilance.

- Add ESLint flat config with typescript-eslint, including rules for
  floating/misused promises, unused variables and no-console
- Add Prettier with eslint-config-prettier to avoid rule conflicts
- Add lint-staged to lint and format only staged files
- Add Husky pre-commit hook (lint-staged) and commit-msg hook
  (commitlint with the conventional preset)
- Add scripts: lint, lint:fix, format, format:check

Verified:
- npm run lint, npm run format:check
- Rejected a non-conventional message, accepted a conventional one
```

---

### Phase 4: Environment configuration

**Goal:** Fail-fast, typed, validated configuration.

**Tasks**
1. Install `zod` and `dotenv` (or use Node's `--env-file`).
2. Create `src/config/env.ts` that parses `process.env` with zod and exports a frozen, typed `env` object. On failure, print every invalid variable and exit with code 1.
3. Variables (with sensible validation): `NODE_ENV` (development | test | production), `PORT`, `LOG_LEVEL`, `DATABASE_URL`, `DB_POOL_MAX`, `DB_POOL_IDLE_MS`, `DB_POOL_CONN_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`, `REDIS_URL`, `JWT_ACCESS_SECRET` (min 32 chars), `JWT_REFRESH_SECRET` (min 32 chars), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `CORS_ORIGINS` (comma-separated → array), `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `TRUST_PROXY`, `SENTRY_DSN` (optional).
4. Create `.env.example` with every variable, safe dummy values and a comment per variable.
5. Create `src/config/constants.ts` for non-env constants.

**Acceptance checks**
- Starting with a missing/invalid variable exits non-zero and lists the problem.
- Starting with a valid `.env` works.
- Unit test: valid env parses; invalid env throws.

**Commit**
```
feat(config): add validated, typed environment configuration

Validate all environment variables at boot with zod so misconfiguration
crashes immediately with a clear message instead of failing at runtime.

- Add src/config/env.ts exporting a frozen, fully typed env object
- Validate NODE_ENV, PORT, DB pool settings, Redis URL, JWT secrets
  (minimum 32 chars), token TTLs, CORS origins and rate-limit settings
- Report all invalid variables at once, then exit with code 1
- Add .env.example documenting every variable with safe dummy values
- Add src/config/constants.ts for non-environment constants
- Add unit tests for valid and invalid configurations

Verified:
- Boot with missing DATABASE_URL exits 1 with a clear error
- npm run typecheck && npm test (config tests)
```

---

### Phase 5: Structured logging

**Goal:** JSON logs in production, readable logs in dev, secrets redacted.

**Tasks**
1. Install `pino`, `pino-http`, `pino-pretty` (dev dependency).
2. `src/lib/logger.ts`: level from env, `pino-pretty` only in development, redaction for `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.token`, `*.refreshToken`, `*.accessToken`. ISO timestamps. Base fields: service name, env.
3. Export a child-logger factory.

**Acceptance checks**
- Dev logs are pretty; `NODE_ENV=production` logs are single-line JSON.
- A logged object containing `password` shows `[Redacted]`.

**Commit**
```
feat(logging): add structured pino logger with secret redaction

Introduce a single logging foundation used across the whole service.

- Add src/lib/logger.ts using pino with level driven by LOG_LEVEL
- Emit JSON in production and human-readable output via pino-pretty in
  development only
- Redact authorization and cookie headers plus password, token,
  accessToken and refreshToken fields to prevent credential leaks
- Include service name and environment on every log line
- Expose a child-logger factory for module-scoped logging

Verified:
- Logged a sample object with a password field; output shows [Redacted]
- Compared dev vs production output formats
```

---

### Phase 6: Express app skeleton and graceful shutdown

**Goal:** Separate app construction from server boot; handle process signals correctly.

**Tasks**
1. Install `express@5` and `@types/express`.
2. `src/app.ts`: exports `createApp()` which builds and returns the Express app (no `listen`). Set `trust proxy` from env, disable `x-powered-by`, mount `express.json({ limit: '100kb' })` and `express.urlencoded({ extended: false, limit: '100kb' })`.
3. `src/server.ts`: create app, `listen`, log startup. Implement graceful shutdown on `SIGTERM` and `SIGINT`: stop accepting connections (`server.close`), wait for in-flight requests, run registered cleanup hooks (DB pool, Redis added later), force-exit after a timeout (e.g. 10s).
4. Handle `unhandledRejection` and `uncaughtException`: log fatal, begin shutdown, exit non-zero.
5. Set `server.keepAliveTimeout` and `server.headersTimeout` sensibly (keepAlive above the load balancer idle timeout).
6. Add a simple cleanup-registry utility so later phases can register shutdown tasks.

**Acceptance checks**
- Server starts on `PORT`.
- `kill -TERM <pid>` logs a graceful shutdown and exits 0.
- Throwing an unhandled rejection logs fatal and exits non-zero.

**Commit**
```
feat(server): add Express 5 app factory and graceful shutdown

Split app construction from process lifecycle so the app can be tested
without opening a port and the process can stop safely.

- Add createApp() in src/app.ts: disable x-powered-by, configure trust
  proxy from env, add JSON/urlencoded parsers with 100kb limits
- Add src/server.ts to listen and log startup details
- Implement graceful shutdown for SIGTERM/SIGINT: stop accepting new
  connections, drain in-flight requests, run registered cleanup hooks,
  and force exit after a 10s timeout
- Add a cleanup registry so later phases (DB, Redis) can hook into
  shutdown
- Handle unhandledRejection and uncaughtException by logging fatal and
  exiting non-zero so the orchestrator restarts the process
- Tune keepAliveTimeout/headersTimeout to avoid load-balancer 502s

Verified:
- Server boots; SIGTERM exits 0 with shutdown logs
- Forced unhandled rejection exits non-zero
```

---

### Phase 7: Error handling

**Goal:** One consistent error model and response shape.

**Tasks**
1. `src/lib/app-error.ts`: `AppError` class with `statusCode`, `code` (machine-readable string), `message`, optional `details`, `isOperational`. Helpers/subclasses: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `TooManyRequestsError`.
2. `src/middleware/not-found.ts`: throws `NotFoundError` for unmatched routes.
3. `src/middleware/error-handler.ts`: global handler. Maps `AppError`, `ZodError` (→ 400 with field details), Postgres errors (unique violation `23505` → 409, foreign key `23503` → 409/400, invalid text `22P02` → 400), and unknown errors (→ 500 with generic message in production, no stack leak). Always logs with request ID; logs 5xx at `error`, 4xx at `warn`.
4. Standard response: `{ "error": { "code", "message", "details?", "requestId" } }`.
5. Mount both at the end of the middleware chain in `app.ts`.

**Acceptance checks**
- Unknown route returns 404 in the standard shape.
- A thrown `AppError` and a thrown generic `Error` both return the standard shape; generic never leaks the stack in production.
- Unit tests for the error-handler mappings.

**Commit**
```
feat(errors): add AppError hierarchy and global error handler

Establish one error model so every failure produces the same response
shape and is logged consistently.

- Add AppError with statusCode, machine-readable code, optional details
  and an isOperational flag, plus common subclasses (BadRequest,
  Unauthorized, Forbidden, NotFound, Conflict, TooManyRequests)
- Add not-found middleware for unmatched routes
- Add global error handler mapping AppError, ZodError (400 with field
  details) and Postgres errors (23505 -> 409, 23503 -> 409,
  22P02 -> 400)
- Hide internals for unknown errors in production (generic 500 message,
  no stack trace)
- Log 5xx as error and 4xx as warn, always including the request ID
- Standard response shape: { error: { code, message, details?, requestId } }

Verified:
- Hit unknown route, thrown AppError and thrown Error; shapes match
- Unit tests for each error mapping
```

---

### Phase 8: Request context, validation and security middleware

**Goal:** Request IDs, request logging, input validation, and baseline security.

**Tasks**
1. Install `helmet`, `cors`, `hpp`, `express-rate-limit`.
2. `request-id.ts`: use incoming `x-request-id` if valid, else generate a UUID; set on `req` and the response header. Wire `pino-http` using that ID and skip `/health` & `/ready` from request logs.
3. `security.ts`: `helmet()` with sensible config, `cors` with an explicit allowlist from `CORS_ORIGINS` (reject unknown origins; support credentials only if needed), `hpp()`.
4. `rate-limit.ts`: a global limiter (in-memory for now, Redis store added in Phase 14) and a stricter `authLimiter` factory for login/register/refresh routes. Standard `429` response through `TooManyRequestsError`.
5. `validate.ts`: generic middleware `validate({ body?, query?, params? })` taking zod schemas; replaces `req.body/query/params` with parsed values; throws `ZodError` to the global handler.
6. Order in `app.ts`: request-id → pino-http → helmet → cors → hpp → body parsers → rate limit → routes → not-found → error-handler.

**Acceptance checks**
- Every response contains `x-request-id`.
- Disallowed CORS origin is rejected.
- Exceeding the rate limit returns 429 in the standard error shape.
- Invalid body on a test route returns 400 with field details.

**Commit**
```
feat(http): add request IDs, security headers, CORS, rate limiting, validation

Add the baseline HTTP middleware stack required for a public-facing API.

- Add request-id middleware (honor valid incoming x-request-id, else
  generate a UUID) and wire pino-http so every log line carries it;
  health endpoints are excluded from request logs
- Add helmet, hpp and CORS restricted to an explicit allowlist from
  CORS_ORIGINS
- Add global rate limiter plus a stricter factory for auth routes;
  429 responses use the standard error shape
- Add generic zod validate() middleware for body, query and params that
  replaces the raw values with parsed, typed data
- Define and document middleware ordering in app.ts

Verified:
- x-request-id present on all responses
- Disallowed origin rejected; 429 returned after limit exceeded
- Invalid payload returns 400 with per-field details
```

---

### Phase 9: PostgreSQL connection, health and readiness

**Goal:** Pooled DB connection with timeouts and real health checks.

**Tasks**
1. Install `pg`, `drizzle-orm`, `@types/pg`, `drizzle-kit`.
2. `src/db/pool.ts`: create a `pg.Pool` with `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`, `statement_timeout` and `idle_in_transaction_session_timeout` from env; SSL config driven by env for production. Handle the pool `error` event (log, do not crash). Export `pool` and `db` (drizzle).
3. `src/db/transaction.ts`: `withTransaction(fn)` helper using drizzle transactions, with automatic rollback.
4. Register `pool.end()` in the shutdown cleanup registry.
5. `modules/health`: `GET /health` (liveness: process up, always 200) and `GET /ready` (readiness: runs `SELECT 1`, returns 503 if DB unreachable; Redis check added later).

**Acceptance checks**
- `/health` returns 200; `/ready` returns 200 with DB up and 503 with DB down.
- Graceful shutdown closes the pool without hanging.

**Commit**
```
feat(db): add PostgreSQL pool, transaction helper and health endpoints

Connect the service to Postgres with production-safe pool settings and
expose liveness/readiness probes for orchestrators.

- Add pg Pool with configurable max size, idle timeout, connection
  timeout, statement_timeout and idle_in_transaction_session_timeout
- Add SSL support controlled by environment for production
- Log pool errors instead of crashing the process
- Expose drizzle instance and a withTransaction() helper that rolls
  back automatically on failure
- Register pool.end() with the graceful-shutdown registry
- Add GET /health (liveness) and GET /ready (readiness via SELECT 1,
  503 when the database is unreachable)

Verified:
- /ready returns 200 with DB up and 503 with DB stopped
- SIGTERM closes the pool and exits cleanly
```

---

### Phase 10: Schema and migrations

**Goal:** Version-controlled schema with correct constraints and indexes.

**Tasks**
1. `drizzle.config.ts` pointing to `src/db/schema` and output dir `drizzle/`.
2. Schema `users`: `id` (uuid, default `gen_random_uuid()`), `email` (text, unique, stored lowercase, with a case-insensitive unique index on `lower(email)`), `password_hash` (text, not null), `role` (enum: `user`, `admin`; default `user`), `is_active` (bool, default true), `created_at`, `updated_at` (timestamptz, default now), `deleted_at` (timestamptz, nullable, soft delete).
3. Schema `refresh_tokens`: `id` (uuid), `user_id` (FK → users, on delete cascade), `token_hash` (text, unique, not null), `family_id` (uuid, for rotation/reuse detection), `expires_at`, `revoked_at` (nullable), `created_at`, `user_agent`, `ip`. Indexes on `user_id`, `family_id`, `expires_at`.
4. A trigger or app-level logic to maintain `updated_at` (prefer a DB trigger via a custom migration).
5. Scripts: `db:generate`, `db:migrate`, `db:studio` (dev only), `db:seed` (dev only).
6. Migrations are forward-only, reviewed, and committed. Production runs migrations as a separate deploy step, not at app start.
7. `seed.ts` creates an admin and a regular user for development only; refuses to run when `NODE_ENV=production`.

**Acceptance checks**
- `npm run db:generate` produces SQL in `drizzle/`.
- `npm run db:migrate` applies cleanly to an empty database and is idempotent.
- Seed refuses to run in production.

**Commit**
```
feat(db): add users and refresh_tokens schema with initial migration

Define the core relational schema with constraints enforced in the
database, not only in application code.

- Add users table: uuid PK, email with case-insensitive unique index on
  lower(email), password_hash, role enum (user/admin), is_active,
  timestamptz audit columns and deleted_at for soft deletes
- Add refresh_tokens table: hashed token (unique), family_id for
  rotation and reuse detection, expires_at, revoked_at, user agent/ip,
  FK to users with ON DELETE CASCADE
- Add indexes on refresh_tokens (user_id, family_id, expires_at)
- Add updated_at trigger via custom migration
- Add drizzle.config.ts and scripts: db:generate, db:migrate, db:studio,
  db:seed
- Add dev-only seed script that refuses to run in production
- Generate and commit the initial migration

Migrations are forward-only and run as a separate deploy step.

Verified:
- db:migrate on an empty database, then run again (idempotent)
- Seed runs in development; refused when NODE_ENV=production
```

---

### Phase 11: Users module (repository, service, controller)

**Goal:** Establish the layered pattern every future module follows.

**Tasks**
1. `users.repository.ts`: all SQL/drizzle calls (findById, findByEmail, create, update, softDelete, list with pagination). Always exclude `deleted_at IS NOT NULL` unless explicitly requested. Return typed rows; never return `password_hash` from list/get-by-id APIs (use dedicated internal method for auth).
2. `users.service.ts`: business rules (email normalization, conflict handling, role changes limited to admins). Throws `AppError`s. No `req`/`res` here.
3. `users.controller.ts`: thin HTTP adapter. `users.routes.ts`: wires routes, validation, and (later) auth.
4. `users.schemas.ts`: zod schemas for create/update/list queries; export inferred types.
5. `src/lib/pagination.ts`: cursor-based pagination helper (`limit` capped, `cursor` opaque base64 of `(created_at, id)`), returning `{ data, pageInfo: { nextCursor, hasMore } }`.
6. Mount under `/api/v1/users`.

**Acceptance checks**
- CRUD works end-to-end via curl/HTTP client.
- Duplicate email returns 409 with the standard error shape.
- List returns stable cursor pagination; `limit` above the cap is clamped or rejected.
- Password hash never appears in any response.

**Commit**
```
feat(users): add users module with repository/service/controller layers

Introduce the layered module structure all features will follow:
routes -> controller -> service -> repository.

- Add users.repository with typed queries (findById, findByEmail,
  create, update, softDelete, paginated list); soft-deleted rows are
  excluded by default
- Add users.service with business rules: email normalization to
  lowercase, duplicate detection (409), role-change restrictions
- Add thin controller and routes mounted at /api/v1/users
- Add zod schemas for create/update/list with exported inferred types
- Add cursor-based pagination helper (opaque cursor over
  created_at + id, capped limit) returning data + pageInfo
- Ensure password_hash is never serialized in API responses

Verified:
- CRUD via HTTP client; duplicate email -> 409
- Pagination across multiple pages is stable
- Inspected responses: no password_hash present
```

---

### Phase 12: Authentication and authorization

**Goal:** Secure register/login/refresh/logout with rotating refresh tokens and RBAC.

**Tasks**
1. Install `argon2`, `jsonwebtoken`, `@types/jsonwebtoken`.
2. `auth.schemas.ts`: register (email, password with min length 12 and basic strength), login, refresh, logout.
3. `token.service.ts`:
   - Access token: short TTL (e.g. 15m), signed with `JWT_ACCESS_SECRET`, claims `sub`, `role`, `jti`.
   - Refresh token: random opaque string (or signed JWT) with a long TTL (e.g. 7-30d). **Store only a SHA-256 hash** in `refresh_tokens`.
   - **Rotation:** every refresh issues a new refresh token in the same `family_id` and revokes the old one.
   - **Reuse detection:** if a revoked token is presented, revoke the entire family and return 401.
4. `auth.service.ts`: register, login (constant-time-ish behavior; generic "invalid credentials" error for both unknown email and wrong password; argon2 verify), refresh, logout (revoke current token), logout-all (revoke all user tokens). Check `is_active` and `deleted_at`.
5. `middleware/authenticate.ts`: verifies the Bearer access token and attaches `req.user = { id, role }`. `middleware/authorize.ts`: `authorize(...roles)` plus an ownership-check helper (`req.user.id === resourceOwnerId || admin`).
6. Apply `authLimiter` to register/login/refresh.
7. Protect users routes: `GET /users/me`, `PATCH /users/me` for any authenticated user; list/delete/role changes for admin only.
8. Extend Express `Request` typing via module augmentation.
9. Optionally deliver the refresh token in an `httpOnly`, `Secure`, `SameSite` cookie; if so, add CSRF consideration notes in the README.

**Acceptance checks**
- Register → login → access protected route → refresh → logout all work.
- Using an old (rotated) refresh token revokes the family and returns 401.
- Non-admin cannot access admin routes (403); missing/invalid token gives 401.
- Login for a wrong password and an unknown email return the same error.
- Tokens and passwords never appear in logs.

**Commit**
```
feat(auth): add JWT auth with rotating refresh tokens and RBAC

Implement authentication and authorization with defense in depth.

- Add register/login/refresh/logout/logout-all endpoints under
  /api/v1/auth with strict zod validation (min password length 12)
- Hash passwords with argon2; return an identical generic error for
  unknown email and wrong password to prevent user enumeration
- Issue short-lived access JWTs (sub, role, jti) and long-lived opaque
  refresh tokens stored only as SHA-256 hashes
- Rotate refresh tokens on every use within a family_id; detect reuse
  of a revoked token and revoke the entire family (return 401)
- Add authenticate middleware (Bearer verification, req.user) and
  authorize(...roles) with an ownership helper
- Apply stricter rate limiting to register/login/refresh
- Protect user routes: /users/me for authenticated users; list, delete
  and role changes for admins only
- Reject inactive or soft-deleted accounts at login and refresh
- Extend Express Request typing with req.user

Verified:
- Full register -> login -> refresh -> logout flow
- Reused rotated refresh token -> family revoked, 401
- Non-admin on admin route -> 403; no token -> 401
- Confirmed logs contain no passwords or tokens
```

---

### Phase 13: API versioning and OpenAPI documentation

**Goal:** Self-documenting, schema-driven API.

**Tasks**
1. Install `@asteasolutions/zod-to-openapi` and `swagger-ui-express`.
2. Register every route's request and response zod schemas in `src/docs/openapi.ts`; document the standard error shape, security scheme (Bearer), pagination params and the rate-limit responses.
3. Serve `GET /api/v1/openapi.json` and Swagger UI at `/api/docs`. **Disable Swagger UI in production** unless explicitly enabled by env flag (e.g. `ENABLE_DOCS=true`).
4. Add a script `docs:generate` to emit `openapi.json` to disk for client generation.

**Acceptance checks**
- `openapi.json` validates (use an OpenAPI validator in a test or CLI).
- All implemented endpoints appear with correct schemas and auth requirements.

**Commit**
```
docs(api): generate OpenAPI spec and Swagger UI from zod schemas

Make the API self-documenting from the same schemas used for validation
so docs cannot drift from behavior.

- Register request/response schemas for all auth and users routes
- Document Bearer security scheme, the standard error response,
  pagination parameters and 429 responses
- Serve /api/v1/openapi.json and Swagger UI at /api/docs
- Disable Swagger UI in production unless ENABLE_DOCS=true
- Add docs:generate script to export openapi.json for client codegen

Verified:
- Spec passes OpenAPI validation
- Every implemented endpoint is present with correct auth requirements
```

---

### Phase 14: Redis, distributed rate limiting and background jobs

**Goal:** Shared state across instances and work off the request path.

**Tasks**
1. Install `ioredis`, `rate-limit-redis`, `bullmq`.
2. `src/lib/redis.ts`: connection with retry strategy; register `quit()` in shutdown; handle `error` events without crashing.
3. Switch the global and auth rate limiters to the Redis store (fall back to the memory store only in `test`).
4. Add Redis check to `/ready`.
5. `src/jobs/`: a queue factory, one example queue (e.g. `email`), a separate worker entrypoint `src/worker.ts` (own process, own graceful shutdown), job retries with exponential backoff, a dead-letter handling strategy, and logging with the job ID.
6. Add `npm run worker` and `npm run worker:dev` scripts.

**Acceptance checks**
- Rate limits are shared across two running app instances.
- Enqueue a job → worker processes it; a failing job retries with backoff.
- `/ready` returns 503 if Redis is down.

**Commit**
```
feat(infra): add Redis-backed rate limiting and BullMQ job workers

Move shared state out of process memory and keep slow work off the
request path.

- Add Redis client with retry strategy, error handling and graceful
  shutdown registration
- Switch global and auth rate limiters to a Redis store so limits hold
  across multiple instances (memory store only in test)
- Include Redis in the /ready readiness check
- Add BullMQ queue factory, an example email queue and a dedicated
  worker process (src/worker.ts) with its own graceful shutdown
- Configure job retries with exponential backoff and log job IDs
- Add worker and worker:dev scripts

Verified:
- Two app instances share one rate-limit budget
- Job enqueued and processed; failing job retried with backoff
- /ready returns 503 with Redis stopped
```

---

### Phase 15: Observability (metrics and error tracking)

**Goal:** Know what the service is doing and be alerted when it breaks.

**Tasks**
1. Install `prom-client` and `@sentry/node`.
2. `src/lib/metrics.ts`: default process metrics, HTTP request duration histogram (labels: method, normalized route, status), request counter, DB pool gauges (total/idle/waiting), job counters/durations.
3. Middleware to record HTTP metrics using the **route pattern** (not raw URL) to avoid label cardinality explosions.
4. `GET /metrics` for Prometheus. Protect it (internal network only or a token from env); never expose it publicly.
5. Initialize Sentry only when `SENTRY_DSN` is set; capture errors in the global handler for 5xx only; scrub PII and auth headers (`beforeSend`); tag with release and environment.

**Acceptance checks**
- `/metrics` exposes HTTP and pool metrics and is protected.
- Route label uses patterns such as `/api/v1/users/:id`.
- With a DSN set, a forced 500 reaches Sentry; 4xx errors do not.

**Commit**
```
feat(observability): add Prometheus metrics and Sentry error tracking

Provide the signals needed to operate the service in production.

- Add prom-client with default process metrics, HTTP request duration
  histogram and counter, DB pool gauges and job metrics
- Label HTTP metrics by route pattern (not raw URL) to avoid
  high-cardinality label explosions
- Add protected GET /metrics endpoint (token or internal network only)
- Add optional Sentry integration enabled only when SENTRY_DSN is set;
  report 5xx only, scrub auth headers and PII, tag release and env

Verified:
- /metrics shows HTTP and pool metrics; unauthenticated access denied
- Forced 500 captured in Sentry; 4xx not captured
```

---

### Phase 16: Testing

**Goal:** Fast unit tests plus integration tests against real Postgres.

**Tasks**
1. Install `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest`, `testcontainers` (and the Postgres module).
2. `vitest.config.ts`: separate `unit` and `integration` projects, coverage thresholds (e.g. 80% lines/branches for `src/modules` and `src/lib`), global setup for the integration project.
3. Integration setup: start a Postgres Testcontainer (and Redis if needed), run migrations, provide a per-test-file or per-test cleanup strategy (truncate tables or transaction rollback). Tests use `createApp()` with Supertest, never a real port.
4. Write tests:
   - **Unit:** env parsing, `AppError`/error-handler mapping, token service (rotation, expiry), pagination cursor encode/decode, authorize middleware.
   - **Integration:** health/ready, register/login/refresh/logout, refresh reuse detection, RBAC (401/403), users CRUD, validation errors (400), duplicate email (409), rate limit (429), pagination.
5. Scripts: `test`, `test:unit`, `test:integration`, `test:coverage`, `test:watch`.

**Acceptance checks**
- `npm run test:unit` is fast (seconds).
- `npm run test:integration` passes against a real Postgres container.
- Coverage threshold enforced; the run fails if it drops.

**Commit**
```
test: add unit and integration suites with real Postgres via Testcontainers

Cover critical behavior with fast unit tests and realistic integration
tests, avoiding database mocks that hide real SQL and constraint bugs.

- Configure Vitest with separate unit and integration projects and
  coverage thresholds for src/modules and src/lib
- Add Testcontainers global setup: ephemeral Postgres (and Redis),
  automatic migrations, per-test cleanup
- Add unit tests: env parsing, error-handler mapping, token rotation
  and expiry, pagination cursors, authorize middleware
- Add integration tests via Supertest on createApp(): health/ready,
  full auth flow, refresh reuse detection, RBAC 401/403, users CRUD,
  validation 400, duplicate 409, rate limit 429, pagination
- Add scripts: test, test:unit, test:integration, test:coverage,
  test:watch

Verified:
- npm run test:unit and test:integration both green
- Coverage thresholds enforced
```

---

### Phase 17: Docker and local development environment

**Goal:** Reproducible local env and a small, secure production image.

**Tasks**
1. `Dockerfile` (multi-stage):
   - `deps` stage: `npm ci`
   - `build` stage: compile TypeScript
   - `runtime` stage: slim base image (e.g. `node:<lts>-slim` or alpine), `NODE_ENV=production`, install only production deps (`npm ci --omit=dev`), copy `dist/` and `drizzle/`, run as the **non-root `node` user**, `EXPOSE`, `HEALTHCHECK` hitting `/health`, `CMD ["node","dist/server.js"]`, use `tini`/`--init` for proper signal handling.
2. `.dockerignore` (node_modules, dist, .git, tests, .env*, coverage).
3. `docker-compose.yml` for local dev: `api` (with a bind mount + watch), `postgres` (healthcheck, named volume), `redis`, and optionally `worker`, `adminer` or `pgadmin` (dev profile only). `depends_on` with `condition: service_healthy`.
4. A separate `migrate` command/service (one-shot) for running migrations.
5. Scripts: `docker:up`, `docker:down`, `docker:migrate`.

**Acceptance checks**
- `docker compose up` brings up a working stack; `/ready` returns 200.
- The production image runs as non-root and is reasonably small.
- `docker stop` triggers graceful shutdown (exit 0, no SIGKILL).

**Commit**
```
build(docker): add multi-stage Dockerfile and local compose stack

Provide a small, secure production image and a one-command local
environment.

- Add multi-stage Dockerfile (deps -> build -> runtime) on a slim
  base: production-only dependencies, non-root user, tini for signal
  handling, HEALTHCHECK on /health, NODE_ENV=production
- Add .dockerignore to keep secrets, tests and VCS data out of the
  build context
- Add docker-compose.yml with api, worker, postgres and redis; health
  checks and depends_on service_healthy ordering; named volume for data
- Add a one-shot migrate service so migrations run as a separate step
- Add docker:up, docker:down and docker:migrate scripts

Verified:
- docker compose up -> /ready 200
- Container runs as non-root; image size recorded in README
- docker stop exits cleanly via graceful shutdown
```

---

### Phase 18: CI pipeline

**Goal:** Every push is linted, type-checked, tested, built and scanned.

**Tasks**
1. `.github/workflows/ci.yml` triggered on `push` and `pull_request`:
   - Jobs: `lint-typecheck` → `test` (Postgres/Redis service containers or Testcontainers) → `build` (compile + build Docker image) → `audit`.
   - Use `actions/setup-node` with npm cache and `npm ci`.
   - Run migrations against the test DB before integration tests.
   - Upload the coverage report as an artifact.
   - `npm audit --omit=dev --audit-level=high` as a non-blocking or blocking job (decide and document).
2. Add `.github/dependabot.yml` (npm + GitHub Actions + Docker, weekly).
3. Optional deploy workflow (manual trigger, environment protection): build/push image → run migrations → deploy → smoke test `/ready` → rollback on failure. Include as documented stub only if no target platform is specified.

**Acceptance checks**
- The workflow file passes `actionlint` (or equivalent).
- All jobs pass on a clean checkout.

**Commit**
```
ci: add GitHub Actions pipeline and Dependabot configuration

Automate quality gates so broken code cannot reach main.

- Add ci workflow: lint + typecheck, tests (Postgres/Redis, migrations
  applied first), production build with Docker image build, and a
  dependency audit job
- Cache npm dependencies and install with npm ci
- Upload coverage report as a build artifact
- Add Dependabot for npm, GitHub Actions and Docker (weekly)
- Document the deployment flow: build -> migrate -> deploy ->
  smoke-test /ready -> rollback on failure

Verified:
- actionlint passes
- All jobs succeed on a clean checkout
```

---

### Phase 19: Documentation

**Goal:** A new developer can run, test, deploy and operate this service from the docs alone.

**Tasks**
1. `README.md`: overview, architecture diagram (Mermaid), tech stack, quick start (local and Docker), environment variable table, scripts table, project structure, API overview and link to docs, testing instructions, migration workflow, deployment guide, troubleshooting.
2. `docs/ARCHITECTURE.md`: layering rules (routes → controller → service → repository), error model, auth/refresh rotation sequence diagram, shutdown sequence.
3. `docs/RUNBOOK.md`: health/readiness meaning, common alerts and responses, how to run migrations safely, rollback procedure, how to rotate JWT secrets, how to scale workers, backup and restore (PITR) procedure.
4. `docs/SECURITY.md`: threat model summary, secret handling, dependency policy, reporting vulnerabilities.
5. `CONTRIBUTING.md`: branching, conventional commit rules, PR checklist, adding a new module step-by-step.

**Acceptance checks**
- Following the README from scratch on a clean machine yields a working app.
- All links and commands in the docs are correct.

**Commit**
```
docs: add README, architecture, runbook, security and contributing guides

Make the project operable by someone who has never seen it.

- README: overview, Mermaid architecture diagram, quick start (local
  and Docker), env variable and script tables, API docs link, testing,
  migrations and deployment guides, troubleshooting
- ARCHITECTURE: layering rules, error model, refresh-token rotation
  sequence, graceful shutdown sequence
- RUNBOOK: probes, alert responses, safe migrations, rollback, JWT
  secret rotation, worker scaling, backup/restore with PITR
- SECURITY: threat model summary, secret handling, dependency policy,
  vulnerability reporting
- CONTRIBUTING: branching, Conventional Commits, PR checklist and a
  step-by-step guide for adding a new module

Verified:
- Followed the README from a clean clone to a running stack
- All commands and links checked
```

---

### Phase 20: Final hardening review

**Goal:** One last pass against the production checklist. Fix gaps, no new features.

**Tasks.** Verify each item and fix whatever fails (one commit per fix group, or a single commit if small):

- [ ] No `console.log` anywhere; all logging goes through pino.
- [ ] No secrets in the repo or git history (`git log -p | grep -i secret` sanity check, plus a secret scanner such as gitleaks).
- [ ] All list endpoints are paginated with a capped limit.
- [ ] All routes validate body, query and params.
- [ ] All outbound HTTP calls (if any) have timeouts and retries.
- [ ] DB indexes exist for every foreign key and every filtered or sorted column; run `EXPLAIN` on the main queries.
- [ ] `statement_timeout` and `idle_in_transaction_session_timeout` are set.
- [ ] Graceful shutdown tested under load (no dropped requests).
- [ ] The 500 response never leaks internals; the stack is hidden in production.
- [ ] CORS allowlist is exact; no wildcard with credentials.
- [ ] `/metrics` and the docs UI are not publicly exposed.
- [ ] Docker image runs non-root; no dev dependencies in the image.
- [ ] `npm audit` is clean for high/critical issues.
- [ ] A load test (autocannon/k6) on login and a list endpoint shows no pool exhaustion.
- [ ] Backup/restore procedure tested at least once.

**Commit**
```
chore: complete final production hardening review

Audit the finished service against the production checklist and close
the remaining gaps.

- Confirm no console usage, no committed secrets (gitleaks clean)
- Confirm every list endpoint is paginated and every route validated
- Verify indexes for all foreign keys and filtered columns with EXPLAIN
- Verify DB timeouts, graceful shutdown under load, error redaction in
  production, exact CORS allowlist and protected /metrics and docs
- Verify non-root image without dev dependencies and a clean audit
- Record load-test results (login and list endpoints) showing no pool
  exhaustion
- Fixes applied: <list each fix made, or "none required">

Verified:
- Full test suite, lint, typecheck, build and docker build green
- Checklist items all confirmed
```

---

## 4. Commit Message Template (for any extra commits)

```
<type>(<scope>): <imperative summary, max 72 chars>

<Why this change was needed, 1-3 sentences.>

- <What changed, one bullet per logical change>
- <Notable decision and the reason for it>

Verified:
- <exact command or manual check you ran>
```

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

**Rules:** one logical change per commit; never mix refactors with features; never commit failing tests; reference issues with `Refs #123` or `Fixes #123` in the footer when relevant.

---

## 5. Definition of Done (whole project)

- All 20 phases are committed in order with truthful, detailed messages.
- `npm run lint && npm run typecheck && npm run test:coverage && npm run build` all pass.
- `docker compose up` yields a healthy stack; `/ready` returns 200.
- OpenAPI docs match the implemented endpoints.
- CI is green on `main`.
- README alone is enough for a new developer to run the project.
