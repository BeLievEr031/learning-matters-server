import { boardsRepository, type BoardsRepository } from './boards.repository.js';
import { schoolsRepository, type SchoolsRepository } from '../schools/schools.repository.js';
import type { Board } from '../../db/schema/boards.js';
import type { CreateBoardInput, UpdateBoardInput, ListBoardsQuery } from './boards.schemas.js';
import type { UserRole } from '../../db/schema/users.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/app-error.js';
import {
  decodeCursor,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../lib/pagination.js';

export interface UserContext {
  schoolId?: string | null;
  role: UserRole;
}

export class BoardsService {
  constructor(
    private readonly repo: BoardsRepository = boardsRepository,
    private readonly schoolsRepo: SchoolsRepository = schoolsRepository,
  ) {}

  /**
   * Verify school exists. Throws NotFoundError if not found.
   */
  private async ensureSchoolExists(schoolId: string): Promise<void> {
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) {
      throw new NotFoundError('School not found');
    }
  }

  /**
   * Verify board exists and that non-super_admin users can only access their school's board.
   */
  private async getAndVerifyBoardAccess(
    id: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Board> {
    const board = await this.repo.findById(id);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    if (callerRole && callerRole !== 'super_admin') {
      if (!callerSchoolId || board.schoolId !== callerSchoolId) {
        throw new ForbiddenError('Forbidden: Access to this board is not allowed');
      }
    }

    return board;
  }

  /**
   * Create a new board within a school with normalized code and duplicate check.
   */
  async createBoard(schoolId: string, input: CreateBoardInput): Promise<Board> {
    await this.ensureSchoolExists(schoolId);

    const normalizedCode = input.code.trim().toUpperCase();

    const existing = await this.repo.findBySchoolAndCode(schoolId, normalizedCode);
    if (existing) {
      throw new ConflictError('Board with this code already exists for this school');
    }

    return this.repo.create({
      schoolId,
      name: input.name.trim(),
      code: normalizedCode,
      description: input.description,
      status: input.status,
    });
  }

  /**
   * Retrieve a board by ID with school-scoped access check.
   */
  async getBoardById(
    id: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Board> {
    return this.getAndVerifyBoardAccess(id, callerSchoolId, callerRole);
  }

  /**
   * Update an existing board. Enforces unique code check per school and school-scoped access control.
   */
  async updateBoard(
    id: string,
    input: UpdateBoardInput,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<Board> {
    const existing = await this.getAndVerifyBoardAccess(id, callerSchoolId, callerRole);

    if (input.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      if (normalizedCode !== existing.code.toUpperCase()) {
        const codeTaken = await this.repo.findBySchoolAndCode(existing.schoolId, normalizedCode);
        if (codeTaken && codeTaken.id !== id) {
          throw new ConflictError('Board with this code already exists for this school');
        }
      }
    }

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError('Board not found');
    }

    return updated;
  }

  /**
   * Soft-delete a board by ID with school-scoped access check.
   */
  async deleteBoard(
    id: string,
    callerSchoolId?: string | null,
    callerRole?: UserRole,
  ): Promise<void> {
    await this.getAndVerifyBoardAccess(id, callerSchoolId, callerRole);
    await this.repo.softDelete(id);
  }

  /**
   * List boards scoped to a school with cursor-based pagination and status/search filters.
   */
  async listBoardsBySchool(
    schoolId: string,
    query: ListBoardsQuery,
  ): Promise<PaginatedResult<Board>> {
    await this.ensureSchoolExists(schoolId);

    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rawItems = await this.repo.listBySchool(schoolId, query.limit, cursor ?? undefined, {
      status: query.status,
      search: query.search,
    });

    return buildPaginatedResponse(rawItems, query.limit, (board) => ({
      createdAt: board.createdAt,
      id: board.id,
    }));
  }
}

export const boardsService = new BoardsService();
