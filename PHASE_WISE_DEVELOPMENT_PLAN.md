# School Management System — Phase-Wise Development Plan

> **Stack:** Node.js 22 · Express 5 · TypeScript · Drizzle ORM · PostgreSQL · Zod · Argon2 · JWT · BullMQ · Vitest · Swagger/OpenAPI

---

## Current State Snapshot

| Layer | Status | Notes |
|---|---|---|
| Project scaffold | ✅ Done | Express 5, TypeScript, Drizzle, tsup, Vitest |
| Security middleware | ✅ Done | Helmet, CORS, HPP, rate-limit (Redis) |
| Auth (JWT + refresh) | ✅ Done | Login, register, rotate, revoke, revoke-all |
| Token service | ✅ Done | Refresh-token rotation with family tracking |
| Users module | ✅ Done | Basic CRUD, repository pattern |
| RBAC middleware | ⚠️ Partial | Only `user` / `admin` roles — needs full 6-role expansion |
| DB schema | ⚠️ Partial | Only `users` + `refresh_tokens` — all domain tables missing |
| OpenAPI docs | ✅ Done | Scaffold with `@asteasolutions/zod-to-openapi` |
| Tests | ✅ Done | Unit + integration with Testcontainers |
| Docker / CI | ✅ Done | `docker-compose.yml`, `.github/` workflows |

---

## Role Hierarchy

```
super-admin
  └─ admin (school-admin)
       └─ principal
            └─ class-teacher
                 └─ teacher
                      └─ student
```

| Role | Scope |
|---|---|
| `super_admin` | System-wide — all schools |
| `admin` | Single school only |
| `principal` | Single school — read-heavy, limited write |
| `class_teacher` | Their grade/class only |
| `teacher` | Their assignments only |
| `student` | Their own profile only |

---

## Naming Conventions for Git Commits

All commits follow **Conventional Commits** (enforced by `commitlint.config.cjs`):

```
<type>(<scope>): <imperative subject>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`
**Scopes:** `auth`, `rbac`, `schools`, `boards`, `grades`, `students`, `subjects`, `teachers`, `assignments`, `db`, `middleware`, `docs`, `seed`, `config`

---

## Phase 0 — Foundation Upgrades

> **Goal:** Expand the existing auth/user infrastructure to support 6 roles and multi-school context before any new modules are built.
> **Estimated effort:** 1–2 days

### 0.1 — Expand Role Enum & User Schema

**What to do:**
- Replace `pgEnum('user_role', ['user', 'admin'])` with all 6 roles: `super_admin`, `admin`, `principal`, `class_teacher`, `teacher`, `student`
- Add `school_id` (nullable UUID FK to `schools`) to `users` table — Super Admin gets `NULL`
- Add `first_name`, `last_name`, `phone`, `status` fields to `users`
- Generate and apply migration

**Files changed:**
- `src/db/schema/users.ts`
- `drizzle/` (new migration file)

```
feat(db): expand user_role enum to all 6 roles and add school context fields

- Replace ['user','admin'] enum with ['super_admin','admin','principal',
  'class_teacher','teacher','student']
- Add school_id nullable FK, first_name, last_name, phone, status to users
- Add index on users.school_id for scoped queries

BREAKING CHANGE: existing 'user' and 'admin' role values are removed;
run migration 0002 to apply the new enum
```

---

### 0.2 — Rebuild RBAC Middleware

**What to do:**
- Update `authorize.ts` to accept all 6 roles
- Add `requireSchoolScope()` middleware: validates that a school-scoped user can only access resources matching their `schoolId`
- Add `requireSuperAdmin()` convenience shorthand
- Update TypeScript `req.user` type to include `schoolId`

**Files changed:**
- `src/middleware/authorize.ts`
- `src/types/express.d.ts` (or equivalent global type file)

```
refactor(rbac): rebuild authorize middleware for 6-role system with school scope

- Accept all roles: super_admin, admin, principal, class_teacher, teacher, student
- Add requireSchoolScope() guard that compares req.user.schoolId to param :schoolId
- Add requireSuperAdmin() shorthand
- Extend Express Request type to include schoolId on req.user
```

---

### 0.3 — Update Auth Service & Schemas

**What to do:**
- Update `LoginInput` / `RegisterInput` Zod schemas to reflect new roles
- Update JWT payload to include `schoolId`
- Update `AuthResult` response to expose `firstName`, `lastName`, `schoolId`
- Add `GET /api/v1/auth/me` endpoint (returns current user profile)

**Files changed:**
- `src/modules/auth/auth.schemas.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.routes.ts`

```
feat(auth): include schoolId in JWT payload and add GET /auth/me endpoint

- Embed schoolId in access token claims for downstream authorization
- Add GET /api/v1/auth/me returning full user profile
- Update Zod schemas for login/register to match expanded user model
```

---

### 0.4 — Update Seed File & Tests

**What to do:**
- Update `seed.ts` to create one `super_admin` and one placeholder school + `admin`
- Fix broken unit/integration tests that referenced old `user`/`admin` roles

```
chore(seed): update seed with super_admin and placeholder school admin

test(auth): fix integration tests broken by role enum expansion
```

---

## Phase 1 — Schools Module

> **Goal:** Full CRUD for schools. Super Admin only.
> **Estimated effort:** 1–2 days

### 1.1 — School Schema & Migration

**What to do:**
- Create `schools` table:
  - id, name, code (UNIQUE), address, city, state, country
  - phone, email, website, logo_url, status
  - created_at, updated_at, deleted_at
- Add index on `schools.status`, `schools.code`
- Apply FK from `users.school_id` to `schools.id`

**Files changed:**
- `src/db/schema/schools.ts` (new)
- `src/db/schema/users.ts` (add FK reference)
- `src/db/schema/index.ts` (re-export)
- `drizzle/` (new migration)

```
feat(db): add schools table with unique code, status, and soft-delete support

- New schools table with full contact/address fields and status enum
- Unique index on schools.code (case-insensitive)
- FK from users.school_id to schools.id
- update_at trigger added for schools table
```

---

### 1.2 — School Repository

**What to do:**
- `schools.repository.ts`: `findAll(filters, pagination)`, `findById`, `findByCode`, `create`, `update`, `softDelete`
- Filtering: `status`, `search` (name / code)
- Pagination: cursor-based or offset (match existing users pattern)

```
feat(schools): add schools repository with CRUD and pagination support
```

---

### 1.3 — School Service

**What to do:**
- `schools.service.ts`: business rules — duplicate code check, status transitions, soft-delete guard

```
feat(schools): add schools service with validation and business rules
```

---

### 1.4 — School Controller & Routes

**What to do:**
- `POST   /api/v1/schools` — super_admin only
- `GET    /api/v1/schools` — super_admin (paginated, filterable)
- `GET    /api/v1/schools/:schoolId` — super_admin OR own-school admin/principal
- `PATCH  /api/v1/schools/:schoolId` — super_admin only
- `DELETE /api/v1/schools/:schoolId` — super_admin only (soft delete)
- Zod schemas for request body + response
- Register route in `app.ts`

**Files changed:**
- `src/modules/schools/schools.controller.ts` (new)
- `src/modules/schools/schools.routes.ts` (new)
- `src/modules/schools/schools.schemas.ts` (new)
- `src/app.ts`

```
feat(schools): implement schools CRUD API with role-based access control

POST   /api/v1/schools          (super_admin)
GET    /api/v1/schools          (super_admin, paginated + search)
GET    /api/v1/schools/:id      (super_admin | own-school scoped)
PATCH  /api/v1/schools/:id      (super_admin)
DELETE /api/v1/schools/:id      (super_admin, soft delete)
```

---

### 1.5 — School Tests

```
test(schools): add unit and integration tests for school management API
```

---

### 1.6 — School OpenAPI Docs

```
docs(schools): register school schemas and routes in OpenAPI spec
```

---

## Phase 2 — Boards Module

> **Goal:** Full CRUD for boards scoped to a school.
> **Estimated effort:** 1 day

### 2.1 — Board Schema & Migration

**What to do:**
- Create `boards` table:
  - id, school_id (FK schools), name, code, description, status
  - created_at, updated_at, deleted_at
- Unique constraint: `(school_id, code)`
- Index on `board.school_id`

```
feat(db): add boards table scoped to school with unique code per school
```

---

### 2.2 — Board Repository, Service, Controller & Routes

**What to do:**
- `POST   /api/v1/schools/:schoolId/boards` — super_admin | admin (own school)
- `GET    /api/v1/schools/:schoolId/boards` — super_admin | admin/principal (own school)
- `GET    /api/v1/boards/:boardId` — super_admin | scoped admin/principal
- `PATCH  /api/v1/boards/:boardId` — super_admin | admin (own school)
- `DELETE /api/v1/boards/:boardId` — super_admin | admin (own school)

```
feat(boards): implement boards CRUD API with school-scoped access control

POST   /api/v1/schools/:schoolId/boards
GET    /api/v1/schools/:schoolId/boards  (paginated, search by name/code)
GET    /api/v1/boards/:boardId
PATCH  /api/v1/boards/:boardId
DELETE /api/v1/boards/:boardId           (soft delete)
```

---

### 2.3 — Board Tests & Docs

```
test(boards): add integration tests for board CRUD including school isolation

docs(boards): register board schemas and routes in OpenAPI spec
```

---

## Phase 3 — Grades/Classes Module

> **Goal:** Grades with section support, scoped to Board then School.
> **Estimated effort:** 1–2 days

### 3.1 — Grade Schema & Migration

**What to do:**
- Create `grades` table:
  - id, school_id (FK schools), board_id (FK boards)
  - name, code, grade_number (int), section (text, nullable)
  - capacity (int, nullable), status
  - created_at, updated_at, deleted_at
- Unique constraint: `(board_id, grade_number, section)`
- Indexes on `school_id`, `board_id`, `status`

```
feat(db): add grades table with section support scoped to board and school

- Composite unique on (board_id, grade_number, section) prevents
  duplicate sections within the same board
- Indexes on school_id, board_id, status for filtered list queries
```

---

### 3.2 — Grade Repository, Service, Controller & Routes

**What to do:**
- `POST   /api/v1/boards/:boardId/grades` — super_admin | admin
- `GET    /api/v1/boards/:boardId/grades` — super_admin | admin/principal/class_teacher
- `GET    /api/v1/grades/:gradeId` — scoped
- `PATCH  /api/v1/grades/:gradeId` — super_admin | admin
- `DELETE /api/v1/grades/:gradeId` — super_admin | admin (soft delete)
- Guard: cannot delete a grade that has active students

```
feat(grades): implement grades/classes CRUD API with section support

POST   /api/v1/boards/:boardId/grades
GET    /api/v1/boards/:boardId/grades   (paginated, filter by section/status)
GET    /api/v1/grades/:gradeId
PATCH  /api/v1/grades/:gradeId
DELETE /api/v1/grades/:gradeId          (blocked if active students exist)
```

---

### 3.3 — Grade Tests & Docs

```
test(grades): add integration tests for grade management and section uniqueness

docs(grades): register grade schemas and routes in OpenAPI spec
```

---

## Phase 4 — Subjects Module

> **Goal:** Subjects associated with grades, reusable within a school.
> **Estimated effort:** 1 day

### 4.1 — Subject Schema & Migration

**What to do:**
- Two-table approach for reusability:
  - `subjects` — master catalog per school: id, school_id, name, code, description, status
  - `grade_subjects` — join table: id, school_id, grade_id, subject_id, status, created_at
- Unique constraint: `(school_id, code)` on `subjects`
- Unique constraint: `(grade_id, subject_id)` on `grade_subjects`

```
feat(db): add subjects and grade_subjects tables with reusable subject design

- subjects table acts as a master catalog scoped per school
- grade_subjects join table assigns subjects to grades
- Prevents duplicate (grade, subject) combos via unique constraint
```

---

### 4.2 — Subject Repository, Service, Controller & Routes

**What to do:**
- `POST   /api/v1/grades/:gradeId/subjects` — assigns subject to grade (creates if new)
- `GET    /api/v1/grades/:gradeId/subjects` — list subjects for a grade
- `GET    /api/v1/subjects/:subjectId` — scoped to school
- `PATCH  /api/v1/subjects/:subjectId` — super_admin | admin
- `DELETE /api/v1/grades/:gradeId/subjects/:subjectId` — removes grade assignment
- `DELETE /api/v1/subjects/:subjectId` — soft deletes master + cascades grade_subjects

```
feat(subjects): implement subjects API with grade-association support

POST   /api/v1/grades/:gradeId/subjects        (assign / create subject)
GET    /api/v1/grades/:gradeId/subjects        (list with pagination)
GET    /api/v1/subjects/:subjectId
PATCH  /api/v1/subjects/:subjectId
DELETE /api/v1/grades/:gradeId/subjects/:id    (remove grade association)
DELETE /api/v1/subjects/:subjectId             (soft delete master subject)
```

---

### 4.3 — Subject Tests & Docs

```
test(subjects): add integration tests for subject CRUD and grade associations

docs(subjects): register subject schemas and routes in OpenAPI spec
```

---

## Phase 5 — Teachers Module

> **Goal:** Teacher profiles scoped to a school.
> **Estimated effort:** 1 day

### 5.1 — Teacher Schema & Migration

**What to do:**
- Create `teachers` table:
  - id, school_id (FK schools), user_id (FK users, nullable)
  - employee_id (UNIQUE per school), first_name, last_name, email, phone
  - joining_date, qualification, status
  - created_at, updated_at, deleted_at
- Unique constraint: `(school_id, employee_id)`
- Unique constraint: `(school_id, email)`
- Index on `school_id`, `status`

```
feat(db): add teachers table with employee_id unique per school

- Optional user_id FK links teacher to auth account
- Unique (school_id, employee_id) prevents duplicate IDs within school
- Unique (school_id, email) prevents duplicate contact within school
```

---

### 5.2 — Teacher Repository, Service, Controller & Routes

**What to do:**
- `POST   /api/v1/schools/:schoolId/teachers` — super_admin | admin
- `GET    /api/v1/schools/:schoolId/teachers` — super_admin | admin/principal
- `GET    /api/v1/teachers/:teacherId` — super_admin | own-school | teacher themselves
- `PATCH  /api/v1/teachers/:teacherId` — super_admin | admin
- `DELETE /api/v1/teachers/:teacherId` — super_admin | admin (soft delete)

```
feat(teachers): implement teachers CRUD API with school-scoped access control

POST   /api/v1/schools/:schoolId/teachers
GET    /api/v1/schools/:schoolId/teachers   (paginated, search by name/employeeId)
GET    /api/v1/teachers/:teacherId
PATCH  /api/v1/teachers/:teacherId
DELETE /api/v1/teachers/:teacherId          (soft delete; blocks if active assignments exist)
```

---

### 5.3 — Teacher Tests & Docs

```
test(teachers): add integration tests for teacher management and school isolation

docs(teachers): register teacher schemas and routes in OpenAPI spec
```

---

## Phase 6 — Students Module

> **Goal:** Student profiles scoped to a grade within a school.
> **Estimated effort:** 1–2 days

### 6.1 — Student Schema & Migration

**What to do:**
- Create `students` table:
  - id, school_id (FK schools), board_id (FK boards), grade_id (FK grades), user_id (FK users, nullable)
  - admission_number (UNIQUE per school), first_name, last_name
  - date_of_birth, gender, email, phone
  - guardian_name, guardian_phone, guardian_email
  - address, status
  - created_at, updated_at, deleted_at
- Unique constraint: `(school_id, admission_number)`
- Index on `school_id`, `grade_id`, `board_id`, `status`

```
feat(db): add students table with admission_number unique per school

- guardian fields for contact information
- Composite index on (grade_id, status) for efficient class-roster queries
- FK guards ensure student cannot be placed in a grade from another school
```

---

### 6.2 — Student Repository, Service, Controller & Routes

**What to do:**
- `POST   /api/v1/grades/:gradeId/students` — super_admin | admin
- `GET    /api/v1/grades/:gradeId/students` — super_admin | admin/principal/class_teacher
- `GET    /api/v1/students/:studentId` — scoped + student themselves
- `PATCH  /api/v1/students/:studentId` — super_admin | admin
- `PATCH  /api/v1/students/:studentId/transfer` — move student to another grade (same school)
- `DELETE /api/v1/students/:studentId` — super_admin | admin (soft delete)

Business rules:
- Target grade must belong to the same school
- Cannot move student to a deactivated grade
- Admission number must be unique within the school

```
feat(students): implement students CRUD API with grade-transfer support

POST   /api/v1/grades/:gradeId/students
GET    /api/v1/grades/:gradeId/students       (paginated, search by name/admission)
GET    /api/v1/students/:studentId
PATCH  /api/v1/students/:studentId
PATCH  /api/v1/students/:studentId/transfer   (grade transfer, same-school guard)
DELETE /api/v1/students/:studentId            (soft delete)
```

---

### 6.3 — Student Tests & Docs

```
test(students): add integration tests for student management and grade transfer

docs(students): register student schemas and routes in OpenAPI spec
```

---

## Phase 7 — Teacher Assignments Module

> **Goal:** Many-to-many teacher, subject, and grade relationships with full validation.
> **Estimated effort:** 2 days

### 7.1 — Teacher Assignment Schema & Migration

**What to do:**
- Create `teacher_assignments` table:
  - id, school_id (FK schools), teacher_id (FK teachers)
  - grade_id (FK grades), subject_id (FK subjects)
  - assigned_by (FK users), status, effective_date
  - created_at, updated_at, deleted_at
- Unique constraint: `(teacher_id, grade_id, subject_id)` — prevents duplicates
- Indexes on `school_id`, `teacher_id`, `grade_id`, `subject_id`

```
feat(db): add teacher_assignments table with composite unique constraint

- Unique (teacher_id, grade_id, subject_id) prevents duplicate assignments
- school_id denormalized for efficient scoped queries without joins
- assigned_by FK tracks who made the assignment for auditability
```

---

### 7.2 — Assignment Repository, Service, Controller & Routes

**What to do:**
- `POST   /api/v1/teacher-assignments` — super_admin | admin
- `GET    /api/v1/teacher-assignments` — super_admin (all) | admin (own school)
- `GET    /api/v1/teachers/:teacherId/assignments` — all assignments for a teacher
- `GET    /api/v1/grades/:gradeId/teachers` — teachers assigned to a grade
- `GET    /api/v1/subjects/:subjectId/teachers` — teachers assigned to a subject
- `PATCH  /api/v1/teacher-assignments/:assignmentId` — update status
- `DELETE /api/v1/teacher-assignments/:assignmentId` — super_admin | admin

**Validation rules (service layer):**
1. Teacher belongs to same school as grade and subject
2. Grade belongs to same school
3. Subject is assigned to the selected grade (via `grade_subjects`)
4. No duplicate assignment
5. Teacher is active (not soft-deleted or deactivated)
6. Grade is active
7. Subject is active

```
feat(assignments): implement teacher assignment API with full cross-entity validation

POST   /api/v1/teacher-assignments
GET    /api/v1/teacher-assignments                  (paginated, filter by teacher/grade/subject)
GET    /api/v1/teachers/:teacherId/assignments
GET    /api/v1/grades/:gradeId/teachers
GET    /api/v1/subjects/:subjectId/teachers
PATCH  /api/v1/teacher-assignments/:id
DELETE /api/v1/teacher-assignments/:id

Validates: school isolation, subject-grade compatibility, no duplicates,
           active status of all referenced entities
```

---

### 7.3 — Assignment Tests & Docs

```
test(assignments): add integration tests for teacher assignments with validation scenarios

Covers: duplicate prevention, cross-school isolation, inactive entity guards,
        subject-grade compatibility check

docs(assignments): register teacher assignment schemas and routes in OpenAPI spec
```

---

## Phase 8 — Principal & Class-Teacher Roles

> **Goal:** Extend RBAC with scoped access for `principal` and `class_teacher` roles.
> **Estimated effort:** 1 day

### 8.1 — Principal Profile Table

**What to do:**
- Create `principals` table:
  - id, school_id (FK schools), user_id (FK users, UNIQUE)
  - employee_id, first_name, last_name, email, phone, status
  - created_at, updated_at
- `GET  /api/v1/schools/:schoolId/principal`
- `PUT  /api/v1/schools/:schoolId/principal`

```
feat(db): add principals table linking principal user accounts to schools

feat(principal): implement principal profile endpoints with admin-level scope
```

---

### 8.2 — Class-Teacher Assignment

**What to do:**
- Add `class_teacher_id` (FK teachers, nullable) to `grades` table
- `PUT  /api/v1/grades/:gradeId/class-teacher` — assign homeroom teacher
- `GET  /api/v1/grades/:gradeId/class-teacher` — get current class teacher

```
feat(db): add class_teacher_id FK to grades for homeroom teacher designation

feat(grades): add class-teacher assignment endpoints

PUT /api/v1/grades/:gradeId/class-teacher
GET /api/v1/grades/:gradeId/class-teacher
```

---

### 8.3 — RBAC Scope Policies for All Roles

| Role | Allowed Resources |
|---|---|
| `super_admin` | Everything |
| `admin` | Own school — all entities |
| `principal` | Own school — read-all, manage teachers/students |
| `class_teacher` | Own grade — read students, view assignments |
| `teacher` | Own assignments — view only |
| `student` | Own profile — read only |

```
refactor(rbac): implement fine-grained scope policies for all 6 roles

- Add canManageSchool(), canManageGrade(), canViewOwnProfile() helpers
- Update all route guards to apply role-appropriate checks
- Principal: read-all + write for teachers/students in own school
- class_teacher: read-only for their assigned grade
- teacher: read-only for their own assignments
- student: own profile only
```

---

## Phase 9 — Advanced Query Features

> **Goal:** Production-grade list APIs with pagination, filtering, sorting, and search.
> **Estimated effort:** 1–2 days

### 9.1 — Standardized Pagination Utility

**What to do:**
- Create `src/lib/pagination.ts`: cursor-based and offset pagination helpers
- Add `PaginationSchema` Zod schema shared across all list endpoints
- Consistent `meta` block in all list responses

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 120,
    "page": 2,
    "limit": 20,
    "totalPages": 6
  }
}
```

```
feat(lib): add shared pagination utility with Zod schema and meta response format
```

---

### 9.2 — Filtering & Sorting on All List Endpoints

Apply to: `schools`, `boards`, `grades`, `students`, `subjects`, `teachers`, `teacher-assignments`

- Filter params: `status`, `search`, entity-specific fields
- Sort params: `sortBy`, `sortOrder` (`asc`/`desc`)
- Default sort: `created_at DESC`

```
feat(api): add filtering, sorting, and search to all list endpoints

Applies consistent query param pattern: ?search=&status=&sortBy=&sortOrder=
across schools, boards, grades, students, subjects, teachers, assignments
```

---

### 9.3 — Soft Delete & Status Transition Guards

```
feat(api): enforce soft-delete and active-child guards across all modules

- Board delete blocked if active grades exist
- Grade delete blocked if active students or assignments exist
- Teacher delete blocked if active assignments exist
- Subject delete blocked if active grade_subject or assignment records exist
```

---

## Phase 10 — Seed Data for Development

> **Goal:** Rich, realistic seed data covering the end-to-end scenario from the spec.
> **Estimated effort:** 0.5 day

**What to seed:**
1. Super Admin user
2. ABC International School + Delhi Public School
3. Boards: CBSE, ICSE under ABC International
4. Grades: Grade 1, 2-A, 2-B, 3, 5-A, 6-A under CBSE
5. Subjects: Math, English, Science for Grade 5-A and 6-A
6. Teachers: John, Sarah, David
7. Assignments: John to Math/Grade5A, Sarah to English/Grade5A, etc.
8. Students: 4 per grade, realistic names + admission numbers
9. School Admin user for ABC International

```
chore(seed): add full development seed covering end-to-end school management scenario

Covers: 2 schools, 2 boards, 6 grades, 10 subjects, 3 teachers,
        teacher assignments, 8 students, super_admin + school admin users
```

---

## Phase 11 — API Documentation (OpenAPI / Swagger)

> **Goal:** Complete, auto-generated OpenAPI 3.1 spec from Zod schemas.
> **Estimated effort:** 1 day

### 11.1 — Register All New Schemas

- Use existing `@asteasolutions/zod-to-openapi` setup
- Register all request/response schemas for every new module
- Tag routes: `Schools`, `Boards`, `Grades`, `Subjects`, `Teachers`, `Students`, `Assignments`
- Include example request/response bodies for each endpoint

```
docs(openapi): register all school management schemas and routes in OpenAPI spec

Covers all 35+ new endpoints with request/response examples,
authentication requirements, and error response schemas
```

---

### 11.2 — README Update

```
docs(readme): update README with school management API setup and usage guide
```

---

## Phase 12 — Tests

> **Goal:** Comprehensive test coverage across all modules.
> **Estimated effort:** 2–3 days

### 12.1 — Unit Tests (Service Layer)

```
test(schools): add unit tests for school service business rules
test(boards): add unit tests for board service including school validation
test(grades): add unit tests for grade service including section uniqueness
test(subjects): add unit tests for subject service and grade association logic
test(teachers): add unit tests for teacher service including school isolation
test(students): add unit tests for student service including transfer logic
test(assignments): add unit tests for assignment service with all validation rules
```

---

### 12.2 — Integration Tests (API Layer)

```
test(schools): add API integration tests with role isolation scenarios
test(boards): add API integration tests with school-scoped access control
test(grades): add API integration tests including section uniqueness validation
test(subjects): add API integration tests including grade-subject associations
test(teachers): add API integration tests with school isolation assertions
test(students): add API integration tests including grade transfer scenarios
test(assignments): add API integration tests covering all validation rules
```

---

### 12.3 — Test Coverage Gate

```
chore(ci): add 80% coverage threshold gate for all new modules
```

---

## Phase 13 — Production Hardening

> **Goal:** Security, performance, and operational readiness.
> **Estimated effort:** 1–2 days

### 13.1 — Per-Route Rate Limiting

```
feat(middleware): add per-route and per-school rate limiting for write endpoints
```

### 13.2 — Audit Log

```
feat(db): add audit_logs table for write-operation traceability

feat(middleware): add audit logging middleware triggered on successful mutations
```

### 13.3 — Database Query Performance

```
perf(db): add composite indexes for high-frequency list and filter queries
```

### 13.4 — Sentry Error Tracking

```
feat(config): enrich Sentry error context with schoolId and userId from req.user
```

---

## Full Commit Sequence (Reference)

```
feat(db): expand user_role enum to all 6 roles and add school context fields
refactor(rbac): rebuild authorize middleware for 6-role system with school scope
feat(auth): include schoolId in JWT payload and add GET /auth/me endpoint
chore(seed): update seed with super_admin and placeholder school admin
test(auth): fix integration tests broken by role enum expansion

feat(db): add schools table with unique code, status, and soft-delete support
feat(schools): add schools repository with CRUD and pagination support
feat(schools): add schools service with validation and business rules
feat(schools): implement schools CRUD API with role-based access control
test(schools): add unit and integration tests for school management API
docs(schools): register school schemas and routes in OpenAPI spec

feat(db): add boards table scoped to school with unique code per school
feat(boards): implement boards CRUD API with school-scoped access control
test(boards): add integration tests for board CRUD including school isolation
docs(boards): register board schemas and routes in OpenAPI spec

feat(db): add grades table with section support scoped to board and school
feat(grades): implement grades/classes CRUD API with section support
test(grades): add integration tests for grade management and section uniqueness
docs(grades): register grade schemas and routes in OpenAPI spec

feat(db): add subjects and grade_subjects tables with reusable subject design
feat(subjects): implement subjects API with grade-association support
test(subjects): add integration tests for subject CRUD and grade associations
docs(subjects): register subject schemas and routes in OpenAPI spec

feat(db): add teachers table with employee_id unique per school
feat(teachers): implement teachers CRUD API with school-scoped access control
test(teachers): add integration tests for teacher management and school isolation
docs(teachers): register teacher schemas and routes in OpenAPI spec

feat(db): add students table with admission_number unique per school
feat(students): implement students CRUD API with grade-transfer support
test(students): add integration tests for student management and grade transfer
docs(students): register student schemas and routes in OpenAPI spec

feat(db): add teacher_assignments table with composite unique constraint
feat(assignments): implement teacher assignment API with full cross-entity validation
test(assignments): add integration tests for teacher assignments with validation scenarios
docs(assignments): register teacher assignment schemas and routes in OpenAPI spec

feat(db): add principals table linking principal user accounts to schools
feat(principal): implement principal profile endpoints with admin-level scope
feat(db): add class_teacher_id FK to grades for homeroom teacher designation
feat(grades): add class-teacher assignment endpoints
refactor(rbac): implement fine-grained scope policies for all 6 roles

feat(lib): add shared pagination utility with Zod schema and meta response format
feat(api): add filtering, sorting, and search to all list endpoints
feat(api): enforce soft-delete and active-child guards across all modules

chore(seed): add full development seed covering end-to-end school management scenario

docs(openapi): register all school management schemas and routes in OpenAPI spec
docs(readme): update README with school management API setup and usage guide

test(schools): add unit tests for school service business rules
test(boards): add unit tests for board service including school validation
test(grades): add unit tests for grade service including section uniqueness
test(subjects): add unit tests for subject service and grade association logic
test(teachers): add unit tests for teacher service including school isolation
test(students): add unit tests for student service including transfer logic
test(assignments): add unit tests for assignment service with all validation rules
test(schools): add API integration tests with role isolation scenarios
test(boards): add API integration tests with school-scoped access control
test(grades): add API integration tests including section uniqueness validation
test(subjects): add API integration tests including grade-subject associations
test(teachers): add API integration tests with school isolation assertions
test(students): add API integration tests including grade transfer scenarios
test(assignments): add API integration tests covering all validation rules
chore(ci): add 80% coverage threshold gate for all new modules

feat(middleware): add per-route and per-school rate limiting for write endpoints
feat(db): add audit_logs table for write-operation traceability
feat(middleware): add audit logging middleware triggered on successful mutations
perf(db): add composite indexes for high-frequency list and filter queries
feat(config): enrich Sentry error context with schoolId and userId from req.user
```

---

## Database Schema — Final ER Summary

```
users
  id, email, password_hash, role (enum x6), school_id->schools,
  first_name, last_name, phone, status, is_active,
  created_at, updated_at, deleted_at

schools
  id, name, code (UNIQUE), address, city, state, country,
  phone, email, website, logo_url, status,
  created_at, updated_at, deleted_at

boards
  id, school_id->schools, name, code,
  UNIQUE(school_id, code), status,
  created_at, updated_at, deleted_at

grades
  id, school_id->schools, board_id->boards,
  name, code, grade_number, section, capacity, class_teacher_id->teachers,
  UNIQUE(board_id, grade_number, section), status,
  created_at, updated_at, deleted_at

subjects
  id, school_id->schools, name, code, description,
  UNIQUE(school_id, code), status,
  created_at, updated_at, deleted_at

grade_subjects
  id, school_id->schools, grade_id->grades, subject_id->subjects,
  UNIQUE(grade_id, subject_id), status, created_at, updated_at

teachers
  id, school_id->schools, user_id->users,
  employee_id, first_name, last_name, email, phone, joining_date, qualification,
  UNIQUE(school_id, employee_id), UNIQUE(school_id, email), status,
  created_at, updated_at, deleted_at

students
  id, school_id->schools, board_id->boards, grade_id->grades, user_id->users,
  admission_number, first_name, last_name, date_of_birth, gender,
  email, phone, guardian_name, guardian_phone, guardian_email, address,
  UNIQUE(school_id, admission_number), status,
  created_at, updated_at, deleted_at

teacher_assignments
  id, school_id->schools, teacher_id->teachers, grade_id->grades, subject_id->subjects,
  assigned_by->users, effective_date,
  UNIQUE(teacher_id, grade_id, subject_id), status,
  created_at, updated_at, deleted_at

principals
  id, school_id->schools, user_id->users (UNIQUE),
  employee_id, first_name, last_name, email, phone, status,
  created_at, updated_at

audit_logs
  id, actor_id->users, actor_role, school_id, action,
  resource_type, resource_id, diff (jsonb), ip, user_agent, created_at
```

---

## File Structure (Target)

```
src/
├── modules/
│   ├── auth/           ✅ exists — needs JWT schoolId + /me endpoint
│   ├── users/          ✅ exists — needs role expansion
│   ├── health/         ✅ exists
│   ├── metrics/        ✅ exists
│   ├── schools/        🔲 Phase 1
│   ├── boards/         🔲 Phase 2
│   ├── grades/         🔲 Phase 3
│   ├── subjects/       🔲 Phase 4
│   ├── teachers/       🔲 Phase 5
│   ├── students/       🔲 Phase 6
│   └── assignments/    🔲 Phase 7
├── db/
│   └── schema/
│       ├── users.ts          ⚠️ needs role expansion + school_id
│       ├── refresh-tokens.ts ✅
│       ├── schools.ts        🔲 Phase 1
│       ├── boards.ts         🔲 Phase 2
│       ├── grades.ts         🔲 Phase 3
│       ├── subjects.ts       🔲 Phase 4
│       ├── grade-subjects.ts 🔲 Phase 4
│       ├── teachers.ts       🔲 Phase 5
│       ├── students.ts       🔲 Phase 6
│       ├── assignments.ts    🔲 Phase 7
│       ├── principals.ts     🔲 Phase 8
│       ├── audit-logs.ts     🔲 Phase 13
│       └── index.ts          ⚠️ needs updates
│   ├── seed.ts               ✅ Phase 10
├── docs/                     ✅ Phase 11
├── middleware/
│   ├── authenticate.ts  ✅
│   ├── authorize.ts     ⚠️ needs 6-role + school scope rebuild
│   └── ...
└── lib/
    ├── pagination.ts    ✅ Phase 9
    └── ...
```

---

## Estimated Total Timeline

| Phase | Focus | Days |
|---|---|---|
| 0 | Foundation (role enum + RBAC) | 1–2 |
| 1 | Schools | 1–2 |
| 2 | Boards | 1 |
| 3 | Grades | 1–2 |
| 4 | Subjects | 1 |
| 5 | Teachers | 1 |
| 6 | Students | 1–2 |
| 7 | Teacher Assignments | 2 |
| 8 | Principal & Class-Teacher | 1 |
| 9 | Pagination / Filtering | 1–2 |
| 10 | Seed | 0.5 |
| 11 | OpenAPI Docs | 1 |
| 12 | Tests | 2–3 |
| 13 | Production Hardening | 1–2 |
| **Total** | | **~18–24 days** |

---

> **Start with Phase 0** — the role enum expansion touches the foundation of auth and RBAC. Every subsequent phase depends on it being correct.
