import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentsService } from './students.service.js';
import { StudentsRepository } from './students.repository.js';
import { GradesRepository } from '../grades/grades.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import type { Student } from '../../db/schema/students.js';
import type { Grade } from '../../db/schema/grades.js';
import type { User } from '../../db/schema/users.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../lib/app-error.js';

describe('StudentsService', () => {
  let service: StudentsService;
  let mockStudentsRepo: StudentsRepository;
  let mockGradesRepo: GradesRepository;
  let mockUsersRepo: UsersRepository;

  const school1Id = '11111111-1111-4111-a111-111111111111';
  const school2Id = '22222222-2222-4222-a222-222222222222';
  const boardId = '33333333-3333-4333-a333-333333333333';
  const grade1Id = '44444444-4444-4444-a444-444444444444';
  const grade2Id = '55555555-5555-4555-a555-555555555555';
  const userId = '66666666-6666-4666-a666-666666666666';

  const mockActiveGrade: Grade = {
    id: grade1Id,
    schoolId: school1Id,
    boardId,
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 40,
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockInactiveGrade: Grade = {
    ...mockActiveGrade,
    id: grade2Id,
    status: 'inactive',
  };

  const mockOtherSchoolGrade: Grade = {
    ...mockActiveGrade,
    id: '77777777-7777-4777-a777-777777777777',
    schoolId: school2Id,
  };

  const mockStudent: Student = {
    id: '88888888-8888-4888-a888-888888888888',
    schoolId: school1Id,
    boardId,
    gradeId: grade1Id,
    userId: null,
    admissionNumber: 'ADM-2026-001',
    firstName: 'Bart',
    lastName: 'Simpson',
    dateOfBirth: new Date('2012-04-01T00:00:00Z'),
    gender: 'male',
    email: 'bart@simpson.edu',
    phone: null,
    guardianName: 'Homer Simpson',
    guardianPhone: '+15551234567',
    guardianEmail: 'homer@simpson.edu',
    address: '742 Evergreen Terrace',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockUser: User = {
    id: userId,
    schoolId: school1Id,
    email: 'bart@simpson.edu',
    passwordHash: 'hash',
    firstName: 'Bart',
    lastName: 'Simpson',
    phone: null,
    role: 'student',
    status: 'active',
    isSuperAdmin: false,
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockStudentsRepo = new StudentsRepository();
    mockGradesRepo = new GradesRepository();
    mockUsersRepo = new UsersRepository();
    service = new StudentsService(mockStudentsRepo, mockGradesRepo, mockUsersRepo);
  });

  describe('createStudent', () => {
    it('creates a student successfully under an active grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockActiveGrade);
      vi.spyOn(mockStudentsRepo, 'findBySchoolAndAdmissionNumber').mockResolvedValue(null);
      const createSpy = vi.spyOn(mockStudentsRepo, 'create').mockResolvedValue(mockStudent);

      const result = await service.createStudent(
        grade1Id,
        {
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
          status: 'active',
        },
        school1Id,
        'admin',
      );

      expect(result).toEqual(mockStudent);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: school1Id,
          boardId,
          gradeId: grade1Id,
          admissionNumber: 'ADM-2026-001',
        }),
      );
    });

    it('rejects creation under an inactive grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockInactiveGrade);

      await expect(
        service.createStudent(
          grade2Id,
          {
            admissionNumber: 'ADM-2026-001',
            firstName: 'Bart',
            lastName: 'Simpson',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError if grade does not exist', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createStudent(
          grade1Id,
          {
            admissionNumber: 'ADM-2026-001',
            firstName: 'Bart',
            lastName: 'Simpson',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if school admin accesses another school grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockOtherSchoolGrade);

      await expect(
        service.createStudent(
          mockOtherSchoolGrade.id,
          {
            admissionNumber: 'ADM-2026-001',
            firstName: 'Bart',
            lastName: 'Simpson',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ConflictError if admission number already exists in same school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockActiveGrade);
      vi.spyOn(mockStudentsRepo, 'findBySchoolAndAdmissionNumber').mockResolvedValue(mockStudent);

      await expect(
        service.createStudent(
          grade1Id,
          {
            admissionNumber: 'ADM-2026-001',
            firstName: 'Bart',
            lastName: 'Simpson',
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('links user account when matching school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockActiveGrade);
      vi.spyOn(mockStudentsRepo, 'findBySchoolAndAdmissionNumber').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue(mockUser);
      const studentWithUser = { ...mockStudent, userId };
      vi.spyOn(mockStudentsRepo, 'create').mockResolvedValue(studentWithUser);

      const result = await service.createStudent(
        grade1Id,
        {
          admissionNumber: 'ADM-2026-001',
          firstName: 'Bart',
          lastName: 'Simpson',
          userId,
          status: 'active',
        },
        school1Id,
        'admin',
      );

      expect(result.userId).toBe(userId);
    });

    it('throws NotFoundError if linked user account not found', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockActiveGrade);
      vi.spyOn(mockStudentsRepo, 'findBySchoolAndAdmissionNumber').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue(null);

      await expect(
        service.createStudent(
          grade1Id,
          {
            admissionNumber: 'ADM-2026-001',
            firstName: 'Bart',
            lastName: 'Simpson',
            userId,
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if linked user belongs to another school', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockActiveGrade);
      vi.spyOn(mockStudentsRepo, 'findBySchoolAndAdmissionNumber').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findById').mockResolvedValue({
        ...mockUser,
        schoolId: school2Id,
      });

      await expect(
        service.createStudent(
          grade1Id,
          {
            admissionNumber: 'ADM-2026-001',
            firstName: 'Bart',
            lastName: 'Simpson',
            userId,
            status: 'active',
          },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listStudentsByGrade', () => {
    it('returns paginated students for grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockActiveGrade);
      vi.spyOn(mockStudentsRepo, 'listByGrade').mockResolvedValue([mockStudent]);

      const result = await service.listStudentsByGrade(grade1Id, { limit: 10 }, school1Id, 'admin');

      expect(result.data).toHaveLength(1);
      expect(result.pageInfo.hasMore).toBe(false);
    });

    it('throws ForbiddenError if accessing another school grade', async () => {
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockOtherSchoolGrade);

      await expect(
        service.listStudentsByGrade(mockOtherSchoolGrade.id, {}, school1Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getStudentById', () => {
    it('returns student for super_admin', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);

      const result = await service.getStudentById(mockStudent.id, null, 'super_admin');
      expect(result).toEqual(mockStudent);
    });

    it('returns student for own school admin', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);

      const result = await service.getStudentById(mockStudent.id, school1Id, 'admin');
      expect(result).toEqual(mockStudent);
    });

    it('returns student for self', async () => {
      const studentWithUser = { ...mockStudent, userId };
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(studentWithUser);

      const result = await service.getStudentById(mockStudent.id, school1Id, 'student', userId);
      expect(result).toEqual(studentWithUser);
    });

    it('throws ForbiddenError for admin of another school', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);

      await expect(service.getStudentById(mockStudent.id, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError if student does not exist', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(null);

      await expect(service.getStudentById('non-existent', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('updateStudent', () => {
    it('updates student successfully', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);
      const updatedStudent = { ...mockStudent, firstName: 'Bartholomew' };
      vi.spyOn(mockStudentsRepo, 'update').mockResolvedValue(updatedStudent);

      const result = await service.updateStudent(
        mockStudent.id,
        { firstName: 'Bartholomew' },
        school1Id,
        'admin',
      );

      expect(result.firstName).toBe('Bartholomew');
    });

    it('checks uniqueness when admission number changes', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);
      vi.spyOn(mockStudentsRepo, 'findBySchoolAndAdmissionNumber').mockResolvedValue({
        ...mockStudent,
        id: 'different-id',
      });

      await expect(
        service.updateStudent(
          mockStudent.id,
          { admissionNumber: 'ADM-NEW-999' },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('throws ForbiddenError when modifying student from another school', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);

      await expect(
        service.updateStudent(mockStudent.id, { firstName: 'NewName' }, school2Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('transferStudent', () => {
    const targetGrade: Grade = {
      ...mockActiveGrade,
      id: grade2Id,
      name: 'Grade 10 - Section B',
      code: 'G10-B',
      section: 'B',
    };

    it('transfers student to another grade within same school', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(targetGrade);
      const transferredStudent = { ...mockStudent, gradeId: targetGrade.id };
      vi.spyOn(mockStudentsRepo, 'transfer').mockResolvedValue(transferredStudent);

      const result = await service.transferStudent(
        mockStudent.id,
        { targetGradeId: targetGrade.id },
        school1Id,
        'admin',
      );

      expect(result.gradeId).toBe(targetGrade.id);
    });

    it('rejects transfer to a grade in another school', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockOtherSchoolGrade);

      await expect(
        service.transferStudent(
          mockStudent.id,
          { targetGradeId: mockOtherSchoolGrade.id },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects transfer to an inactive grade', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockInactiveGrade);

      await expect(
        service.transferStudent(
          mockStudent.id,
          { targetGradeId: mockInactiveGrade.id },
          school1Id,
          'admin',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ForbiddenError if caller is from another school', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);

      await expect(
        service.transferStudent(
          mockStudent.id,
          { targetGradeId: targetGrade.id },
          school2Id,
          'admin',
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteStudent', () => {
    it('soft-deletes student successfully', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);
      const softDeleteSpy = vi.spyOn(mockStudentsRepo, 'softDelete').mockResolvedValue(true);

      await service.deleteStudent(mockStudent.id, school1Id, 'admin');
      expect(softDeleteSpy).toHaveBeenCalledWith(mockStudent.id);
    });

    it('throws ForbiddenError when deleting student from another school', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(mockStudent);

      await expect(service.deleteStudent(mockStudent.id, school2Id, 'admin')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('throws NotFoundError if student not found', async () => {
      vi.spyOn(mockStudentsRepo, 'findById').mockResolvedValue(null);

      await expect(service.deleteStudent('non-existent', school1Id, 'admin')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
