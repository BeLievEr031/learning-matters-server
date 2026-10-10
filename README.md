# Learning Matters Backend Server

> Production-grade REST API backend service for the Learning Matters educational platform, engineered with Express 5, TypeScript (strict mode), PostgreSQL (Drizzle ORM), Redis, and BullMQ.

[![CI](https://github.com/learning-matters/server/actions/workflows/ci.yml/badge.svg)](https://github.com/learning-matters/server/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Local Development Setup](#local-development-setup)
  - [Docker Compose Quick Start](#docker-compose-quick-start)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Role Hierarchy & RBAC](#role-hierarchy--rbac)
- [API Overview & Documentation](#api-overview--documentation)
  - [Core Endpoints](#core-endpoints)
  - [School Management Modules](#school-management-modules)
  - [Query Parameters & Pagination](#query-parameters--pagination)
- [Database & Seed Data](#database--seed-data)
  - [Migrations](#migrations)
  - [Development Seed](#development-seed)
- [Background Jobs & Workers](#background-jobs--workers)
- [Observability & Health Checks](#observability--health-checks)
- [Testing](#testing)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

Learning Matters Server is built following strict production standards, ensuring zero-downtime rolling deploys, end-to-end type safety, resilient database pooling, and defense-in-depth security.

```mermaid
graph TD
    Client[Web & Mobile Clients] -->|HTTPS| Proxy[Reverse Proxy / Cloudflare]
    Proxy -->|Load Balancer| App[Express 5 API Server]

    subgraph Core App
        App --> Mid[Security, Rate Limiting & Auth Middleware]
        Mid --> Router[App Router v1]
        Router --> Controller[Controller Layer]
        Controller --> Service[Service Layer + Business Guards]
        Service --> Repo[Repository Layer]
    end

    Repo -->|Drizzle ORM + Pool| Postgres[(PostgreSQL 16 DB)]
    Service -->|IOPromise / Queue| Redis[(Redis 7 Cache & Queues)]

    subgraph Background Processing
        Redis --> BullMQ[BullMQ Job Queues]
        BullMQ --> Worker[Dedicated Worker Process]
    end

    subgraph Observability
        App --> Prom[/metrics Prometheus Exporter/]
        App --> Sentry[Sentry Error Tracking 5xx only]
        App --> Pino[Pino Structured JSON Logger]
    end
```

---

## Tech Stack

| Component               | Technology               | Description                                              |
| ----------------------- | ------------------------ | -------------------------------------------------------- |
| **Runtime**             | Node.js 22 LTS           | Fast, modern JavaScript runtime with native ESM          |
| **Language**            | TypeScript 5 (Strict)    | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| **Framework**           | Express 5.2              | Modern asynchronous route error forwarding               |
| **Database**            | PostgreSQL 16            | Relational store with ACID transactions                  |
| **ORM / Query Builder** | Drizzle ORM              | Type-safe SQL schema definitions and migrations          |
| **Cache & Queues**      | Redis 7 + BullMQ         | Distributed rate limiting and resilient worker queues    |
| **Security**            | Helmet, CORS, HPP        | Strict HTTP headers, parameter pollution prevention      |
| **Auth & RBAC**         | Argon2id + JWT           | Rotating opaque refresh tokens with 6-role hierarchy     |
| **Validation**          | Zod 3                    | Type inference and runtime input sanitization            |
| **Docs**                | OpenAPI 3.0 + Swagger UI | Generated automatically from Zod schemas                 |
| **Metrics & Errors**    | Prom-client + Sentry     | Route-normalized histograms and scrubbed error captures  |
| **Testing**             | Vitest + Testcontainers  | Real PostgreSQL container testing with 80%+ coverage     |

---

## Project Structure

```
server/
├── .github/                 # GitHub Actions workflows & Dependabot
├── drizzle/                 # Generated SQL migrations
├── src/
│   ├── config/              # Validated environment schemas & constants
│   ├── db/                  # Connection pool, transactions, and Drizzle schemas
│   │   ├── schema/          # Domain schemas (schools, boards, grades, subjects, etc.)
│   │   ├── migrate.ts       # Database migration runner
│   │   ├── pool.ts          # PostgreSQL pool connection
│   │   └── seed.ts          # Idempotent development database seeder
│   ├── docs/                # OpenAPI specification generator & Swagger UI
│   ├── jobs/                # BullMQ queues, job workers, and email worker
│   ├── lib/                 # Shared utilities (logger, metrics, redis, pagination)
│   ├── middleware/          # Express middlewares (security, auth, authorize, rate limit)
│   ├── modules/             # Modular feature domains
│   │   ├── auth/            # Authentication, token rotation, sessions, /me
│   │   ├── boards/          # Educational boards management
│   │   ├── grades/          # Grades/classes and class teacher assignments
│   │   ├── health/          # Kubernetes /healthz, /live and /ready probes
│   │   ├── metrics/         # Prometheus /metrics endpoint
│   │   ├── principals/      # School principal management
│   │   ├── schools/         # School tenants and configuration
│   │   ├── students/        # Student admissions, profiles, and transfers
│   │   ├── subjects/        # Master subjects and grade-subject mappings
│   │   ├── teacher-assignments/ # Subject/grade teacher assignments
│   │   ├── teachers/        # Teacher directory and employee profiles
│   │   └── users/           # User management, CRUD, pagination
│   ├── server.ts            # API HTTP server entrypoint
│   └── worker.ts            # Background job consumer entrypoint
├── tests/
│   └── integration/         # Supertest integration tests with Testcontainers
├── Dockerfile               # Multi-stage production container build
├── docker-compose.yml       # Local development stack
└── vitest.config.ts         # Vitest test runner configuration
```

---

## Quick Start

### Prerequisites

- **Node.js**: `>=22.0.0`
- **npm**: `>=10.0.0`
- **Docker & Docker Compose**: (for running PostgreSQL and Redis)

### Local Development Setup

1. **Clone the repository and install dependencies:**

   ```bash
   git clone https://github.com/learning-matters/server.git
   cd server
   npm ci
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   # Customize passwords and JWT secrets in .env
   ```

3. **Start local infrastructure (PostgreSQL & Redis):**

   ```bash
   docker compose up -d postgres redis
   ```

4. **Run database migrations:**

   ```bash
   npm run db:migrate
   ```

5. **Seed development database:**

   ```bash
   npm run db:seed
   ```

6. **Start API server and background worker in watch mode:**

   ```bash
   # Terminal 1: API Server
   npm run dev

   # Terminal 2: Worker Process
   npm run worker:dev
   ```

The API will be available at `http://localhost:3000`.

### Docker Compose Quick Start

To spin up the entire production-like stack (Postgres, Redis, Migration runner, API, and Worker) with a single command:

```bash
npm run docker:up
```

Verify service readiness:

```bash
curl http://localhost:3000/ready
```

Stop the stack:

```bash
npm run docker:down
```

---

## Environment Variables

All environment variables are validated at startup with Zod. Missing or malformed variables halt the process immediately.

| Variable               | Type   | Default                  | Description                                             |
| ---------------------- | ------ | ------------------------ | ------------------------------------------------------- |
| `NODE_ENV`             | Enum   | `development`            | `development`, `test`, or `production`                  |
| `PORT`                 | Number | `3000`                   | Port for the HTTP server                                |
| `DATABASE_URL`         | String | -                        | PostgreSQL connection URI                               |
| `DB_POOL_MIN`          | Number | `2`                      | Minimum connection pool size                            |
| `DB_POOL_MAX`          | Number | `10`                     | Maximum connection pool size                            |
| `REDIS_URL`            | String | `redis://localhost:6379` | Redis connection URI                                    |
| `JWT_ACCESS_SECRET`    | String | -                        | Secret for signing short-lived access JWTs (>=32 chars) |
| `JWT_REFRESH_SECRET`   | String | -                        | Secret for rotating refresh tokens (>=32 chars)         |
| `JWT_ACCESS_TTL`       | String | `15m`                    | Access token lifespan (`15m`, `1h`)                     |
| `JWT_REFRESH_TTL`      | String | `7d`                     | Refresh token lifespan (`7d`, `30d`)                    |
| `CORS_ORIGIN`          | String | `http://localhost:3000`  | Comma-separated list of allowed origins                 |
| `RATE_LIMIT_MAX`       | Number | `100`                    | Max requests per rate limit window                      |
| `RATE_LIMIT_WINDOW_MS` | Number | `60000`                  | Rate limit window in milliseconds (1 min)               |
| `METRICS_TOKEN`        | String | -                        | Optional bearer token to protect `/metrics`             |
| `SENTRY_DSN`           | String | -                        | Optional Sentry DSN for 5xx exception tracking          |
| `LOG_LEVEL`            | Enum   | `info`                   | `trace`, `debug`, `info`, `warn`, `error`, `fatal`      |

---

## Available Scripts

| Script                     | Command                            | Description                           |
| -------------------------- | ---------------------------------- | ------------------------------------- |
| `npm run dev`              | `tsx watch src/server.ts`          | Start API server in watch mode        |
| `npm run build`            | `tsup`                             | Compile production bundle to `dist/`  |
| `npm start`                | `node dist/server.js`              | Run compiled production server        |
| `npm run typecheck`        | `tsc --noEmit`                     | Strict TypeScript compiler validation |
| `npm run lint`             | `eslint src`                       | Lint TypeScript source files          |
| `npm run lint:fix`         | `eslint src --fix`                 | Auto-fix linting issues               |
| `npm run format:check`     | `prettier --check "src/**/*.ts"`   | Verify formatting across files        |
| `npm run format`           | `prettier --write "src/**/*.ts"`   | Auto-format files with Prettier       |
| `npm test`                 | `vitest run`                       | Execute unit and integration tests    |
| `npm run test:unit`        | `vitest run --project unit`        | Fast unit test suite                  |
| `npm run test:integration` | `vitest run --project integration` | Integration test suite                |
| `npm run test:coverage`    | `vitest run --coverage`            | Generate v8 coverage report           |
| `npm run db:migrate`       | `tsx src/db/migrate.ts`            | Execute pending database migrations   |
| `npm run db:generate`      | `drizzle-kit generate`             | Generate SQL migration from schema    |
| `npm run db:seed`          | `tsx src/db/seed.ts`               | Seed development database             |
| `npm run docs:generate`    | `tsx src/docs/generate.ts`         | Re-generate `openapi.json`            |
| `npm run docker:up`        | `docker compose up -d`             | Launch local Docker Compose stack     |
| `npm run docker:down`      | `docker compose down`              | Tear down Docker Compose stack        |

---

## Role Hierarchy & RBAC

The system implements a 6-role hierarchical access control model with strict school scoping:

```
super_admin
  └─ admin (school-admin)
       └─ principal
            └─ class_teacher
                 └─ teacher
                      └─ student
```

| Role            | Scope               | Privileges & Description                                                                     |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `super_admin`   | Global (all schools)| Full unrestricted system management, school creation, cross-school access.                   |
| `admin`         | Single school       | Full administration of own school (boards, grades, subjects, staff, students, assignments). |
| `principal`     | Single school       | Read-heavy leadership view: inspect grades, teachers, students, and assignment status.       |
| `class_teacher` | Assigned grade      | Teacher privileges + direct roster and student overview for their designated class/section. |
| `teacher`       | Assigned subjects   | Subject and assignment roster access for their assigned curriculum classes.                  |
| `student`       | Self-only           | Read-only access to their own profile, enrolled subjects, and assignments.                   |

---

## API Overview & Documentation

Interactive Swagger documentation is available in non-production environments at:

- **Swagger UI:** `http://localhost:3000/api/docs`
- **OpenAPI 3.0 Spec:** `http://localhost:3000/api/v1/openapi.json`

### Core Endpoints

- **Authentication (`/api/v1/auth`)**
  - `POST /register`: Create a new user account with hashed password.
  - `POST /login`: Authenticate credentials, return access token and refresh token.
  - `POST /refresh`: Rotate refresh token with reuse detection.
  - `POST /logout`: Revoke single refresh session.
  - `POST /logout-all`: Revoke all sessions across all devices for user.
  - `GET /me`: Fetch authenticated user profile and roles.
- **User Management (`/api/v1/users`)**
  - `GET /me`: Fetch authenticated user profile.
  - `PATCH /me`: Self-update profile details.
  - `GET /`: Cursor/offset paginated user directory (`admin` / `super_admin`).
  - `POST /`: Create a new user with role and school association.
  - `GET /:id`: Fetch user by ID.
  - `PATCH /:id`: Update user role or active status.
  - `DELETE /:id`: Soft-delete user account.
- **Probes & Operations**
  - `GET /healthz`: Liveness probe (HTTP server status and uptime).
  - `GET /live`: Kubernetes liveness check.
  - `GET /ready`: Readiness probe (deep ping of PostgreSQL and Redis).
  - `GET /metrics`: Protected Prometheus metrics (scrape endpoint).

### School Management Modules

- **Schools (`/api/v1/schools`)**
  - `POST /`: Create new school tenant (`super_admin` only).
  - `GET /`: List schools with search, status filtering, and pagination.
  - `GET /:schoolId`: Get school details (Super Admin or school staff).
  - `PATCH /:schoolId`: Update school configuration (`super_admin` only).
  - `DELETE /:schoolId`: Soft-delete school (`super_admin` only).
  - `GET /:schoolId/principal`: Get principal profile of school.
  - `PUT /:schoolId/principal`: Upsert principal profile for school.
- **Boards (`/api/v1/schools/:schoolId/boards` & `/api/v1/boards/:boardId`)**
  - `POST /api/v1/schools/:schoolId/boards`: Create education board (e.g. CBSE, ICSE).
  - `GET /api/v1/schools/:schoolId/boards`: List boards for school with filtering.
  - `GET /api/v1/boards/:boardId`: Get board by ID.
  - `PATCH /api/v1/boards/:boardId`: Update board details.
  - `DELETE /api/v1/boards/:boardId`: Soft-delete board (guarded if active grades exist).
- **Grades (`/api/v1/boards/:boardId/grades` & `/api/v1/grades/:gradeId`)**
  - `POST /api/v1/boards/:boardId/grades`: Create grade/class under board.
  - `GET /api/v1/boards/:boardId/grades`: List grades under board.
  - `GET /api/v1/grades/:gradeId`: Get grade details.
  - `PATCH /api/v1/grades/:gradeId`: Update grade details.
  - `DELETE /api/v1/grades/:gradeId`: Soft-delete grade (guarded if active students/assignments exist).
  - `GET /api/v1/grades/:gradeId/class-teacher`: Get assigned class teacher.
  - `PUT /api/v1/grades/:gradeId/class-teacher`: Assign/remove class teacher.
- **Subjects (`/api/v1/grades/:gradeId/subjects` & `/api/v1/subjects/:subjectId`)**
  - `POST /api/v1/grades/:gradeId/subjects`: Create or associate subject to grade.
  - `GET /api/v1/grades/:gradeId/subjects`: List subjects associated with grade.
  - `DELETE /api/v1/grades/:gradeId/subjects/:subjectId`: Disassociate subject from grade.
  - `GET /api/v1/subjects/:subjectId`: Get master subject details.
  - `PATCH /api/v1/subjects/:subjectId`: Update master subject.
  - `DELETE /api/v1/subjects/:subjectId`: Soft-delete subject (guarded if active associations exist).
- **Teachers (`/api/v1/schools/:schoolId/teachers` & `/api/v1/teachers/:teacherId`)**
  - `POST /api/v1/schools/:schoolId/teachers`: Register teacher profile.
  - `GET /api/v1/schools/:schoolId/teachers`: List teachers with search and filters.
  - `GET /api/v1/teachers/:teacherId`: Get teacher profile.
  - `PATCH /api/v1/teachers/:teacherId`: Update teacher profile.
  - `DELETE /api/v1/teachers/:teacherId`: Soft-delete teacher (guarded if active assignments exist).
- **Students (`/api/v1/grades/:gradeId/students` & `/api/v1/students/:studentId`)**
  - `POST /api/v1/grades/:gradeId/students`: Enroll student in grade.
  - `GET /api/v1/grades/:gradeId/students`: List students in grade.
  - `GET /api/v1/students/:studentId`: Get student profile.
  - `PATCH /api/v1/students/:studentId`: Update student profile.
  - `PATCH /api/v1/students/:studentId/transfer`: Transfer student to another grade.
  - `DELETE /api/v1/students/:studentId`: Soft-delete student profile.
- **Teacher Assignments (`/api/v1/teacher-assignments`)**
  - `POST /api/v1/teacher-assignments`: Assign teacher to grade and subject.
  - `GET /api/v1/teacher-assignments`: List assignments with search and filters.
  - `GET /api/v1/teacher-assignments/:assignmentId`: Get assignment by ID.
  - `PATCH /api/v1/teacher-assignments/:assignmentId`: Update assignment status.
  - `DELETE /api/v1/teacher-assignments/:assignmentId`: Soft-delete assignment.
  - `GET /api/v1/teachers/:teacherId/assignments`: List assignments for teacher.
  - `GET /api/v1/grades/:gradeId/teachers`: List teachers assigned to grade.
  - `GET /api/v1/subjects/:subjectId/teachers`: List teachers assigned to subject.

### Query Parameters & Pagination

All list endpoints support unified query parameters:

```
GET /api/v1/schools?search=international&status=active&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```

- **`search`**: Case-insensitive substring matching against names, codes, or emails.
- **`status`**: State filtering (e.g. `active`, `inactive`, `suspended`).
- **`sortBy` & `sortOrder`**: Sort by allowed column names (`asc` or `desc`).
- **`page` & `limit`**: Offset-based pagination with unified `meta` response block:

```json
{
  "success": true,
  "data": [...],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  },
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

## Database & Seed Data

### Migrations

All schema modifications are tracked via Drizzle ORM migrations in `drizzle/`.

1. **Modify Schema:** Edit definitions in `src/db/schema/`.
2. **Generate Migration:**
   ```bash
   npm run db:generate
   ```
3. **Review Migration:** Check the generated SQL in `drizzle/`.
4. **Apply Migrations:**
   ```bash
   npm run db:migrate
   ```

### Development Seed

The seed script creates a complete development scenario with realistic data:

```bash
npm run db:seed
```

**Pre-seeded Accounts (Password for all: `Password123!@#`):**

- **Super Admin:** `superadmin@learning-matters.com` (System-wide access)
- **School Admin:** `admin@abcschool.edu` (ABC International School)
- **Principal:** `principal@abcschool.edu` (ABC International School)
- **Teachers:**
  - `john.doe@abcschool.edu` (Class teacher of Grade 5-A, Math teacher)
  - `sarah.connor@abcschool.edu` (English teacher)
  - `david.miller@abcschool.edu` (Class teacher of Grade 6-A, Science teacher)
- **Schools:** ABC International School (`ABC001`) and Delhi Public School (`DPS001`)
- **Curriculum:** CBSE and ICSE boards, 6 grades, 10 subjects, 8 students

---

## Background Jobs & Workers

BullMQ is used for reliable background job processing backed by Redis.

- **Email Worker:** Asynchronously sends transaction notifications and welcome emails.
- **Concurrency & Failure:** Configured with exponential backoff retries and dead-letter monitoring.
- **Running Workers:** In production, run workers independently using `npm run worker`.

---

## Observability & Health Checks

- **Prometheus Metrics:** Request durations, error rates, and connection pool saturation are scraped via `GET /metrics`. Route labels use normalized patterns (`/api/v1/users/:id`) to prevent high-cardinality metric explosion.
- **Sentry Integration:** Captures unhandled 5xx exceptions. Headers and sensitive payload keys (`password`, `refreshToken`) are automatically scrubbed before transmission.
- **Structured Logging:** Fast JSON logs using Pino with automatic `x-request-id` correlation.

---

## Testing

The test suite is partitioned into unit tests and integration tests:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (with Testcontainers or Docker fallback)
npm run test:integration

# Enforce coverage threshold (>80% required)
npm run test:coverage
```

---

## Troubleshooting

- **Redis Connection Failures:** Ensure Redis is running (`docker compose up -d redis`) or check `REDIS_URL` in `.env`.
- **Database Connection Refused:** Ensure PostgreSQL is running and credentials match in `.env`. Run `docker compose ps` to inspect container health.
- **Docker Permission Issues:** The production image runs as non-root `node` (UID 1000). Ensure mounted directories have appropriate read/write permissions.
