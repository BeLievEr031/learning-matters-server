import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeachersService } from './teachers.service.js';
import { TeachersRepository } from './teachers.repository.js';
import { SchoolsRepository } from '../schools/schools.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { TeacherAssignmentsRepository } from '../teacher-assignments/teacher-assignments.repository.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { School } from '../../db/schema/schools.js';
import type { User } from '../../db/schema/users.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../lib/app-error.js';

describe('TeachersService', () => {
  let service: TeachersService;
  let mockTeachersRepo: TeachersRepository;
  let mockSchoolsRepo: SchoolsRepository;
  let mockUsersRepo: UsersRepository;
  let mockTeacherAssignmentsRepo: TeacherAssignmentsRepository;

  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const userId1 = '99999999-9999-4999-a999-999999999999';

  const mockSchool: School = {
    id: school1Id,
    name: 'Springfield Elementary',
    code: 'SPFLD',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'Oregon',
    country: 'USA',
    phone: '+15551234567',
    email: 'contact@springfield.edu',
    website: 'https://springfield.edu',
    logoUrl: null,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockTeacher: Teacher = {
    id: '55555555-5555-4555-a555-555555555555',
    schoolId: school1Id,
    userId: userId1,
    employeeId: 'EMP-001',
    firstName: 'Edna',
    lastName: 'Krabappel',
    email: 'edna@springfield.edu',
    phone: '+15559876543',
    joiningDate: new Date('2025-08-01T00:00:00Z'),
    qualification: 'M.Ed.',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockUser: User = {
    id: userId1,
    email: 'edna@springfield.edu',
    passwordHash: 'hash',
    role: 'teacher',
    schoolId: school1Id,
    firstName: 'Edna',
    lastName: 'Krabappel',
    phone: '+15559876543',
    status: 'active',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    mockTeachersRepo = new TeachersRepository();
    mockSchoolsRepo = new SchoolsRepository();
    mockUsersRepo = new UsersRepository();
    mockTeacherAssignmentsRepo = new TeacherAssignmentsRepository();
    service = new TeachersService(
      mockTeachersRepo,
      mockSchoolsRepo,
      mockUsersRepo,
      mockTeacherAssignmentsRepo,
    );
    vi.spyOn(mockTeacherAssignmentsRepo, 'hasActiveAssignmentsByTeacher').mockResolvedValue(false);
  });

  describe('createTeacher', () => {
    it('creates a teacher with normalized employeeId and email', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue(mockUser);
      const createSpy = vi.spyOn(mockTeachersRepo, 'create').mockResolvedValue(mockTeacher);

      const result = await service.createTeacher(
        school1Id,
        {
          employeeId: ' emp-001 ',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: ' EDNA@springfield.edu ',
          userId: userId1,
          status: 'active',
        },
        school1Id,
        'admin',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: school1Id,
          employeeId: 'emp-001',
          email: 'edna@springfield.edu',
        }),
      );
      expect(result).toEqual(mockTeacher);
    });

    it('throws NotFoundError if target school does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createTeacher(
          'missing-school',
          {
            employeeId: 'EMP-001',
            firstName: 'Edna',
            lastName: 'Krabappel',
            email: 'edna@springfield.edu',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if caller attempts to create teacher in another school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue({
        ...mockSchool,
        id: school2Id,
      });

      await expect(
        service.createTeacher(
          school2Id,
          {
            employeeId: 'EMP-001',
            firstName: 'Edna',
            lastName: 'Krabappel',
            email: 'edna@springfield.edu',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ConflictError if employee ID already exists in the same school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(mockTeacher);

      await expect(
        service.createTeacher(
          school1Id,
          {
            employeeId: 'EMP-001',
            firstName: 'Edna',
            lastName: 'Krabappel',
            email: 'newemail@springfield.edu',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError if email already exists in the same school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue(mockTeacher);

      await expect(
        service.createTeacher(
          school1Id,
          {
            employeeId: 'EMP-999',
            firstName: 'Edna',
            lastName: 'Krabappel',
            email: 'edna@springfield.edu',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('throws NotFoundError if linked user account does not exist', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createTeacher(
          school1Id,
          {
            employeeId: 'EMP-001',
            firstName: 'Edna',
            lastName: 'Krabappel',
            email: 'edna@springfield.edu',
            userId: 'missing-user',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if linked user account belongs to a different school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue({
        ...mockUser,
        schoolId: school2Id,
      });

      await expect(
        service.createTeacher(
          school1Id,
          {
            employeeId: 'EMP-001',
            firstName: 'Edna',
            lastName: 'Krabappel',
            email: 'edna@springfield.edu',
            userId: userId1,
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listTeachersBySchool', () => {
    it('returns paginated teachers under the school', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'listBySchool').mockResolvedValue([mockTeacher]);

      const result = await service.listTeachersBySchool(
        school1Id,
        { limit: 10 },
        school1Id,
        'admin',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.employeeId).toBe('EMP-001');
    });

    it('throws NotFoundError if school not found', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.listTeachersBySchool('missing-school', {}, school1Id, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTeacherById', () => {
    it('allows super_admin to retrieve any teacher', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      const result = await service.getTeacherById(mockTeacher.id, 'other-school', 'super_admin');

      expect(result).toEqual(mockTeacher);
    });

    it('allows teacher to retrieve their own profile via userId match', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      const result = await service.getTeacherById(mockTeacher.id, school1Id, 'teacher', userId1);

      expect(result).toEqual(mockTeacher);
    });

    it('allows same-school staff to retrieve teacher', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      const result = await service.getTeacherById(mockTeacher.id, school1Id, 'principal');

      expect(result).toEqual(mockTeacher);
    });

    it('throws ForbiddenError for cross-school teacher access', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      await expect(service.getTeacherById(mockTeacher.id, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError if teacher does not exist', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(null);

      await expect(service.getTeacherById('missing-teacher', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('updateTeacher', () => {
    it('updates teacher successfully', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      const updatedTeacher = { ...mockTeacher, firstName: 'Elizabeth' };
      vi.spyOn(mockTeachersRepo, 'update').mockResolvedValue(updatedTeacher);

      const result = await service.updateTeacher(
        mockTeacher.id,
        { firstName: 'Elizabeth' },
        school1Id,
        'admin',
      );

      expect(result).toEqual(updatedTeacher);
    });

    it('throws ConflictError if updated employeeId belongs to another teacher in school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue({
        ...mockTeacher,
        id: 'other-teacher-id',
        employeeId: 'EMP-002',
      });

      await expect(
        service.updateTeacher(mockTeacher.id, { employeeId: 'EMP-002' }, school1Id, 'admin'),
      ).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError if updated email belongs to another teacher in school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue({
        ...mockTeacher,
        id: 'other-teacher-id',
        email: 'other@springfield.edu',
      });

      await expect(
        service.updateTeacher(
          mockTeacher.id,
          { email: 'other@springfield.edu' },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('throws NotFoundError if teacher to update is missing', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.updateTeacher('missing', { firstName: 'Elizabeth' }, school1Id, 'admin'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if modifying teacher from another school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue({
        ...mockTeacher,
        schoolId: school2Id,
      });

      await expect(
        service.updateTeacher(mockTeacher.id, { firstName: 'Elizabeth' }, school1Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteTeacher', () => {
    it('soft-deletes teacher successfully', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      const deleteSpy = vi.spyOn(mockTeachersRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteTeacher(mockTeacher.id, school1Id, 'admin');

      expect(deleteSpy).toHaveBeenCalledWith(mockTeacher.id);
    });

    it('throws ConflictError if teacher has active assignments', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeacherAssignmentsRepo, 'hasActiveAssignmentsByTeacher').mockResolvedValue(true);

      await expect(service.deleteTeacher(mockTeacher.id, school1Id, 'admin')).rejects.toThrow(
        ConflictError,
      );
    });

    it('throws NotFoundError if teacher to delete does not exist', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(null);

      await expect(service.deleteTeacher('missing-id', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError if deleting teacher from another school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue({
        ...mockTeacher,
        schoolId: school2Id,
      });

      await expect(service.deleteTeacher(mockTeacher.id, school1Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
