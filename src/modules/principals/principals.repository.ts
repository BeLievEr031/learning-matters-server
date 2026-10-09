import { eq } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { principals, type Principal, type PrincipalStatus } from '../../db/schema/principals.js';

export interface UpsertPrincipalData {
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null | undefined;
  status?: PrincipalStatus | undefined;
}

export class PrincipalsRepository {
  /**
   * Find a principal by school ID.
   */
  async findBySchoolId(schoolId: string): Promise<Principal | null> {
    const [principal] = await db
      .select()
      .from(principals)
      .where(eq(principals.schoolId, schoolId))
      .limit(1);

    return principal ?? null;
  }

  /**
   * Find a principal by user ID.
   */
  async findByUserId(userId: string): Promise<Principal | null> {
    const [principal] = await db
      .select()
      .from(principals)
      .where(eq(principals.userId, userId))
      .limit(1);

    return principal ?? null;
  }

  /**
   * Upsert a principal for a school.
   * If a principal record already exists for the school, it is updated.
   */
  async upsert(schoolId: string, data: UpsertPrincipalData): Promise<Principal> {
    const status = data.status ?? 'active';
    const phone = data.phone ?? null;

    const [result] = await db
      .insert(principals)
      .values({
        schoolId,
        userId: data.userId,
        employeeId: data.employeeId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone,
        status,
      })
      .onConflictDoUpdate({
        target: principals.schoolId,
        set: {
          userId: data.userId,
          employeeId: data.employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone,
          status,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!result) {
      throw new Error('Failed to upsert principal');
    }
    return result;
  }
}

export const principalsRepository = new PrincipalsRepository();
