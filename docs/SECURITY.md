# Security Policy

The Learning Matters engineering team takes the security of our users and data seriously. This document details our security posture, threat model, secret handling policies, and vulnerability reporting procedures.

---

## 1. Threat Model Summary

| Vector                           | Mitigation Strategy                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SQL Injection**                | Parameterized queries enforced via Drizzle ORM query builders. Raw string interpolation in SQL is strictly prohibited.                                              |
| **Authentication & Brute Force** | Argon2id password hashing with memory and iteration parameters (`m=65536, t=3, p=4`). Stricter auth rate limiting (10 attempts per 15 minutes).                     |
| **Token Theft & Replay**         | Opaque refresh tokens stored as SHA-256 hashes in PostgreSQL. Family-based automatic reuse detection immediately invalidates all compromised sessions.              |
| **Data Leakage & PII**           | Sensitive fields (`passwordHash`) excluded from base queries and safe DTOs. Log messages and Sentry events scrub `authorization`, `cookie`, `password`, and tokens. |
| **Denial of Service (DoS)**      | Multi-tier rate limiting via Redis (`globalRateLimiter` and `authRateLimiter`), body payload caps (`100kb`), and database query timeouts (`statement_timeout=30s`). |
| **Container Compromise**         | Multi-stage Docker build drops root privileges; the runtime image runs under the unprivileged `node` user (UID 1000).                                               |

---

## 2. Secret Handling Policy

- **No Secrets in Code:** Passwords, private keys, database URLs, and JWT secrets must never be committed to source control.
- **Git History Auditing:** Verified via pre-commit hooks and CI auditing scans.
- **Environment Separation:** Development, staging, and production environments maintain isolated database credentials and distinct cryptographic keys.

---

## 3. Dependency Security Policy

- **Automated Dependabot:** Weekly automated scans for npm, Docker base images, and GitHub Actions.
- **Strict Version Pinning:** `package-lock.json` checked into source control; production images built using `npm ci`.
- **Security Audits:** CI executes `npm audit --omit=dev --audit-level=high` on all pull requests.

---

## 4. Reporting Vulnerabilities

If you discover a potential security vulnerability within this repository, please **do not open a public GitHub issue**.

Instead, please send a responsible disclosure email to:
**security@learning-matters.com**

Please include:

- A description of the vulnerability and potential impact.
- Step-by-step reproduction instructions or proof-of-concept code.
- Your contact details for coordinated disclosure.

We will acknowledge receipt of your vulnerability report within 24 hours and provide regular updates on remediation progress.
