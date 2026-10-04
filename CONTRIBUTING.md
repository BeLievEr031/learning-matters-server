# Contributing Guide

Thank you for contributing to Learning Matters! We maintain high engineering standards to ensure our platform remains secure, reliable, and maintainable.

---

## 1. Branching Strategy

- **`main`**: Production-ready code. Direct pushes are protected; all changes merge via pull requests.
- **Feature Branches**: Branch from `main` using descriptive prefixes:
  - `feat/feature-name`
  - `fix/bug-fix-name`
  - `docs/documentation-update`
  - `refactor/clean-architecture`

---

## 2. Conventional Commit Guidelines

Commit messages are automatically validated by Husky and Commitlint using the [Conventional Commits](https://www.conventionalcommits.org/) standard.

### Format

```
<type>(<scope>): <subject line in imperative mood (max 72 chars)>

<Detailed explanation of why this change was made, wrapped at ~72 chars.>

- <Bullet point detailing what changed>
- <Bullet point detailing any architectural decisions>

Verified:
- <Specific acceptance commands or tests that passed>
```

### Allowed Types

- `feat`: New feature or endpoint.
- `fix`: Bug fix.
- `docs`: Documentation updates.
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `perf`: Performance improvement.
- `test`: Adding or updating tests.
- `build`: Build system or dependency updates.
- `ci`: CI configuration files and scripts.
- `chore`: Repository maintenance tasks.

---

## 3. Pull Request Checklist

Before submitting a pull request, ensure all local checks pass:

- [ ] `npm run typecheck`: Strict TypeScript compile succeeds with zero errors.
- [ ] `npm run lint`: ESLint check passes with zero errors or warnings.
- [ ] `npm run format:check`: Prettier formatting is compliant.
- [ ] `npm test`: Full test suite (both unit and integration) passes.
- [ ] `npm run test:coverage`: Line, statement, function, and branch coverage exceed 80%.
- [ ] OpenAPI docs updated if API request or response schemas were modified (`npm run docs:generate`).

---

## 4. Step-by-Step Guide: Adding a New Module

When introducing a new domain module (e.g. `courses`):

1. **Define Schema & Types:**
   - Create table definition in `src/db/schema/courses.ts`.
   - Export in `src/db/schema/index.ts`.
   - Run `npm run db:generate` to produce the migration.
2. **Define Validation Schemas:**
   - Create Zod schemas in `src/modules/courses/courses.schemas.ts`.
3. **Implement Repository Layer:**
   - Create `src/modules/courses/courses.repository.ts` for database queries.
4. **Implement Service Layer:**
   - Create `src/modules/courses/courses.service.ts` containing business logic.
5. **Implement Controller Layer:**
   - Create `src/modules/courses/courses.controller.ts` handling HTTP requests.
6. **Define Routes:**
   - Create `src/modules/courses/courses.routes.ts` with validation and auth middleware.
   - Mount router in `src/app.ts`.
7. **Write Tests:**
   - Create unit tests (`src/modules/courses/courses.test.ts`).
   - Create integration tests (`tests/integration/courses.integration.test.ts`).
8. **Register in OpenAPI:**
   - Register endpoints in `src/docs/openapi.ts` and regenerate with `npm run docs:generate`.
