import { eq, desc } from 'drizzle-orm';
import { db, type Database } from '../../db/pool.js';
import { auditLogs, type AuditLog, type NewAuditLog } from '../../db/schema/audit-logs.js';
import { DEFAULT_PAGE_SIZE } from '../../config/constants.js';

export class AuditLogsRepository {
  constructor(private readonly database: Database = db) {}

  async create(data: NewAuditLog): Promise<AuditLog> {
    const [created] = await this.database.insert(auditLogs).values(data).returning();
    if (!created) {
      throw new Error('Failed to create audit log record');
    }
    return created;
  }

  async findById(id: string): Promise<AuditLog | null> {
    const [log] = await this.database.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);

    return log ?? null;
  }

  async listBySchool(schoolId: string, limit = DEFAULT_PAGE_SIZE): Promise<AuditLog[]> {
    return this.database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.schoolId, schoolId))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(limit);
  }

  async listByActor(actorId: string, limit = DEFAULT_PAGE_SIZE): Promise<AuditLog[]> {
    return this.database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, actorId))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(limit);
  }

  async list(limit = DEFAULT_PAGE_SIZE): Promise<AuditLog[]> {
    return this.database
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(limit);
  }
}

export const auditLogsRepository = new AuditLogsRepository();
