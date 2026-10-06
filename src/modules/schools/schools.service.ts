import { schoolsRepository, type SchoolsRepository } from './schools.repository.js';
import type { School } from '../../db/schema/schools.js';
import type { CreateSchoolInput, UpdateSchoolInput, ListSchoolsQuery } from './schools.schemas.js';
import { NotFoundError, ConflictError } from '../../lib/app-error.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export class SchoolsService {
  constructor(private readonly repo: SchoolsRepository = schoolsRepository) {}

  /**
   * Create a new school with normalized code and duplicate check.
   */
  async createSchool(input: CreateSchoolInput): Promise<School> {
    const normalizedCode = input.code.trim().toUpperCase();

    const existing = await this.repo.findByCode(normalizedCode);
    if (existing) {
      throw new ConflictError('School with this code already exists');
    }

    return this.repo.create({
      ...input,
      code: normalizedCode,
    });
  }

  /**
   * Retrieve a school by ID. Throws NotFoundError if not found or soft-deleted.
   */
  async getSchoolById(id: string): Promise<School> {
    const school = await this.repo.findById(id);
    if (!school) {
      throw new NotFoundError('School not found');
    }
    return school;
  }

  /**
   * Update an existing school. Enforces unique code check upon code changes and status transition validity.
   */
  async updateSchool(id: string, input: UpdateSchoolInput): Promise<School> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('School not found');
    }

    if (input.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      if (normalizedCode !== existing.code.toUpperCase()) {
        const codeTaken = await this.repo.findByCode(normalizedCode);
        if (codeTaken && codeTaken.id !== id) {
          throw new ConflictError('School with this code already exists');
        }
      }
    }

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError('School not found');
    }

    return updated;
  }

  /**
   * Soft-delete a school by ID. Throws NotFoundError if not found.
   */
  async deleteSchool(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('School not found');
    }

    await this.repo.softDelete(id);
  }

  /**
   * List schools with cursor-based pagination and status/search filters.
   */
  async listSchools(query: ListSchoolsQuery): Promise<PaginatedResult<School>> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rawItems = await this.repo.list(query.limit, cursor ?? undefined, {
      status: query.status,
      search: query.search,
    });

    return buildPaginatedResponse(rawItems, query.limit, (school) => ({
      createdAt: school.createdAt,
      id: school.id,
    }));
  }
}

export const schoolsService = new SchoolsService();
