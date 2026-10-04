# Operations Runbook

This runbook outlines operational procedures, incident diagnostics, migration steps, and recovery routines for the Learning Matters backend service.

---

## 1. Probes & Health Checks

| Probe         | Endpoint      | Expected Response                     | Description                                                                                           |
| ------------- | ------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Liveness**  | `GET /health` | `200 {"status":"ok","uptime":...}`    | Checks if the Node.js event loop is responsive.                                                       |
| **Readiness** | `GET /ready`  | `200 {"status":"ready","checks":...}` | Executes `SELECT 1` on PostgreSQL and `PING` on Redis. Fails (503) if either dependency is unhealthy. |

### Diagnostic Actions on 503 Readiness Failure

```bash
# Check PostgreSQL status
docker compose exec postgres pg_isready -U postgres

# Check Redis status
docker compose exec redis redis-cli ping

# Check active application error logs
docker compose logs --tail=100 api | grep "Readiness probe failed"
```

---

## 2. Common Alerts & Remediation

### Alert: High HTTP 5xx Error Rate

1. Check Sentry for error grouping and stack traces.
2. Filter Pino logs by `level=50`:
   ```bash
   kubectl logs -l app=learning-matters-api --tail=200 | jq 'select(.level >= 50)'
   ```
3. If database pool exhaustion is indicated, inspect active connections:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```

### Alert: BullMQ Worker Lag / High Job Queue Latency

1. Check Redis memory usage:
   ```bash
   redis-cli info memory
   ```
2. Scale up background workers:
   ```bash
   kubectl scale deployment learning-matters-worker --replicas=5
   ```

---

## 3. Database Migration Procedures

### Pre-Deployment Migration (Forward-Compatible Only)

- All schema changes must follow the **Expand and Contract pattern**:
  - Add columns as nullable or with defaults.
  - Never drop columns or rename existing columns in the same release as code changes.
- To execute migrations manually:
  ```bash
  npm run db:migrate
  ```

### Rollback Procedure

If a deployment fails:

1. Revert container image to previous release:
   ```bash
   kubectl rollout undo deployment/learning-matters-api
   kubectl rollout undo deployment/learning-matters-worker
   ```
2. Because schema changes are backward-compatible, older code versions continue to function without reverting the database schema immediately.

---

## 4. JWT Secret Rotation Procedure

Access tokens have a 15-minute lifespan (`JWT_ACCESS_TTL`), and refresh tokens have a 7-day lifespan.

1. **Step 1:** Deploy updated service with dual-verification or overlap if implementing phased rotation.
2. **Step 2 (Immediate emergency revocation):**
   - Update `JWT_ACCESS_SECRET` in environment/secrets manager.
   - Run SQL query to revoke all active refresh tokens:
     ```sql
     UPDATE refresh_tokens SET revoked_at = NOW() WHERE revoked_at IS NULL;
     ```
   - Restart all API server pods. All users will be required to re-authenticate.

---

## 5. Backup & Restore (PITR) Procedure

### Daily Automated Backups

PostgreSQL supports Continuous Archiving and Point-in-Time Recovery (PITR) using Write-Ahead Logging (WAL).

### Creating a Manual Snapshot

```bash
pg_dump -U postgres -Fc -f /backups/learning_matters_$(date +%Y%m%d_%H%M%S).dump learning_matters
```

### Restoring from Snapshot

1. Terminate active connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'learning_matters';
   ```
2. Restore database:
   ```bash
   pg_restore -U postgres -d learning_matters -c /backups/learning_matters_backup.dump
   ```
