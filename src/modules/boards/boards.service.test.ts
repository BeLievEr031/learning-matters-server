import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardsService } from './boards.service.js';
import { BoardsRepository } from './boards.repository.js';
import { SchoolsRepository } from '../schools/schools.repository.js';
import { GradesRepository } from '../grades/grades.repository.js';
import type { Board } from '../../db/schema/boards.js';
import type { School } from '../../db/schema/schools.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../lib/app-error.js';

describe('BoardsService', () => {
  let service: BoardsService;
  let mockBoardsRepo: BoardsRepository;
  let mockSchoolsRepo: SchoolsRepository;
  let mockGradesRepo: GradesRepository;

  const mockSchool: School = {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Greenwood High',
    code: 'GWH001',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    country: 'USA',
    phone: '+1234567890',
    email: 'info@greenwood.edu',
    website: 'https://greenwood.edu',
    logoUrl: 'https://greenwood.edu/logo.png',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockBoard: Board = {
    id: '22222222-2222-4222-a222-222222222222',
    schoolId: mockSchool.id,
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National education board',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    mockBoardsRepo = new BoardsRepository();
    mockSchoolsRepo = new SchoolsRepository();
    mockGradesRepo = new GradesRepository();
    service = new BoardsService(mockBoardsRepo, mockSchoolsRepo, mockGradesRepo);
    vi.spyOn(mockGradesRepo, 'hasActiveGradesByBoard').mockResolvedValue(false);
  });

  describe('createBoard', () => {
    it('creates board with normalized uppercase code', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      const findByCodeSpy = vi.spyOn(mockBoardsRepo, 'findBySchoolAndCode').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockBoardsRepo, 'create').mockResolvedValue(mockBoard);

      const result = await service.createBoard(mockSchool.id, {
        name: 'Central Board of Secondary Education',
        code: 'cbse',
        status: 'active',
      });

      expect(findByCodeSpy).toHaveBeenCalledWith(mockSchool.id, 'CBSE');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: mockSchool.id,
          name: 'Central Board of Secondary Education',
          code: 'CBSE',
        }),
      );
      expect(result).toEqual(mockBoard);
    });

    it('throws NotFoundError if school does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createBoard('non-existent-school', {
          name: 'CBSE',
          code: 'CBSE',
          status: 'active',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError if board code already exists in school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockBoardsRepo, 'findBySchoolAndCode').mockResolvedValue(mockBoard);

      await expect(
        service.createBoard(mockSchool.id, {
          name: 'Another CBSE',
          code: 'CBSE',
          status: 'active',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getBoardById', () => {
    it('returns board when found for super_admin', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      const result = await service.getBoardById(mockBoard.id, null, 'super_admin');
      expect(result).toEqual(mockBoard);
    });

    it('returns board when found for own school admin', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      const result = await service.getBoardById(mockBoard.id, mockSchool.id, 'admin');
      expect(result).toEqual(mockBoard);
    });

    it('throws ForbiddenError when accessed by admin from another school', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      await expect(service.getBoardById(mockBoard.id, 'other-school-id', 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError when board not found', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(null);

      await expect(service.getBoardById('non-existent-id', mockSchool.id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('updateBoard', () => {
    it('updates board successfully for own school admin', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      vi.spyOn(mockBoardsRepo, 'update').mockResolvedValue({
        ...mockBoard,
        name: 'Updated Board Name',
      });

      const result = await service.updateBoard(
        mockBoard.id,
        { name: 'Updated Board Name' },
        mockSchool.id,
        'admin',
      );

      expect(result.name).toBe('Updated Board Name');
    });

    it('throws ForbiddenError when updated by admin of another school', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      await expect(
        service.updateBoard(mockBoard.id, { name: 'Updated Name' }, 'different-school', 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ConflictError when new code conflicts with another board in the school', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      vi.spyOn(mockBoardsRepo, 'findBySchoolAndCode').mockResolvedValue({
        ...mockBoard,
        id: '33333333-3333-4333-a333-333333333333',
        code: 'ICSE',
      });

      await expect(
        service.updateBoard(mockBoard.id, { code: 'ICSE' }, mockSchool.id, 'admin'),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteBoard', () => {
    it('soft-deletes board successfully', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      const deleteSpy = vi.spyOn(mockBoardsRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteBoard(mockBoard.id, mockSchool.id, 'admin');
      expect(deleteSpy).toHaveBeenCalledWith(mockBoard.id);
    });

    it('throws ConflictError when deleting board with active grades', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);
      vi.spyOn(mockGradesRepo, 'hasActiveGradesByBoard').mockResolvedValue(true);

      await expect(service.deleteBoard(mockBoard.id, mockSchool.id, 'admin')).rejects.toThrow(
        ConflictError,
      );
    });

    it('throws ForbiddenError when deleting board from another school', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(mockBoard);

      await expect(service.deleteBoard(mockBoard.id, 'other-school', 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError when board to delete does not exist', async () => {
      vi.spyOn(mockBoardsRepo, 'findById').mockResolvedValue(null);

      await expect(service.deleteBoard('unknown-board', mockSchool.id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('listBoardsBySchool', () => {
    it('returns paginated boards when school exists', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockBoardsRepo, 'listBySchool').mockResolvedValue([mockBoard]);

      const result = await service.listBoardsBySchool(mockSchool.id, { limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe(mockBoard.id);
      expect(result.pageInfo.hasMore).toBe(false);
    });

    it('throws NotFoundError if school does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.listBoardsBySchool('non-existent-school', { limit: 10 }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
