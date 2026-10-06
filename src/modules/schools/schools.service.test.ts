import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchoolsService } from './schools.service.js';
import { SchoolsRepository } from './schools.repository.js';
import type { School } from '../../db/schema/schools.js';
import { ConflictError, NotFoundError } from '../../lib/app-error.js';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let mockRepo: SchoolsRepository;

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

  beforeEach(() => {
    mockRepo = new SchoolsRepository();
    service = new SchoolsService(mockRepo);
  });

  describe('createSchool', () => {
    it('creates school with normalized uppercase code', async () => {
      const findByCodeSpy = vi.spyOn(mockRepo, 'findByCode').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockRepo, 'create').mockResolvedValue(mockSchool);

      const result = await service.createSchool({
        name: 'Greenwood High',
        code: 'gwh001',
        status: 'active',
      });

      expect(findByCodeSpy).toHaveBeenCalledWith('GWH001');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Greenwood High',
          code: 'GWH001',
        }),
      );
      expect(result).toEqual(mockSchool);
    });

    it('throws ConflictError if code already exists', async () => {
      vi.spyOn(mockRepo, 'findByCode').mockResolvedValue(mockSchool);

      await expect(
        service.createSchool({
          name: 'Another School',
          code: 'GWH001',
          status: 'active',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getSchoolById', () => {
    it('returns school when found', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(mockSchool);

      const result = await service.getSchoolById(mockSchool.id);
      expect(result).toEqual(mockSchool);
    });

    it('throws NotFoundError when not found', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(null);

      await expect(service.getSchoolById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSchool', () => {
    it('updates school successfully', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockRepo, 'update').mockResolvedValue({
        ...mockSchool,
        name: 'Updated School Name',
      });

      const result = await service.updateSchool(mockSchool.id, {
        name: 'Updated School Name',
      });

      expect(result.name).toBe('Updated School Name');
    });

    it('throws ConflictError when updated code belongs to another school', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockRepo, 'findByCode').mockResolvedValue({
        ...mockSchool,
        id: '22222222-2222-4222-a222-222222222222',
        code: 'TAKEN01',
      });

      await expect(
        service.updateSchool(mockSchool.id, {
          code: 'TAKEN01',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('throws NotFoundError when school to update is not found', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(null);

      await expect(service.updateSchool('non-existent', { name: 'Name' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('deleteSchool', () => {
    it('soft deletes existing school', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(mockSchool);
      const softDeleteSpy = vi.spyOn(mockRepo, 'softDelete').mockResolvedValue(true);

      await expect(service.deleteSchool(mockSchool.id)).resolves.toBeUndefined();
      expect(softDeleteSpy).toHaveBeenCalledWith(mockSchool.id);
    });

    it('throws NotFoundError when school does not exist', async () => {
      vi.spyOn(mockRepo, 'findById').mockResolvedValue(null);

      await expect(service.deleteSchool('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listSchools', () => {
    it('returns paginated response with pageInfo', async () => {
      vi.spyOn(mockRepo, 'list').mockResolvedValue([mockSchool]);

      const result = await service.listSchools({ limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pageInfo.hasMore).toBe(false);
      expect(result.pageInfo.nextCursor).toBeNull();
    });
  });
});
