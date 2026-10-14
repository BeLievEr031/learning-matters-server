import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeachersService } from './teachers.service.js';
import {
  TeachersRepository,
  type AssignedGradeResult,
  type AssignedSubjectResult,
} from './teachers.repository.js';
import { SchoolsRepository } from '../schools/schools.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { GradesRepository } from '../grades/grades.repository.js';
import { SubjectsRepository } from '../subjects/subjects.repository.js';
import { StudentsRepository } from '../students/students.repository.js';
import { TeacherAssignmentsRepository } from '../teacher-assignments/teacher-assignments.repository.js';
import type { Teacher } from '../../db/schema/teachers.js';
import type { School } from '../../db/schema/schools.js';
import type { User } from '../../db/schema/users.js';
import type { Grade } from '../../db/schema/grades.js';
import type { Subject } from '../../db/schema/subjects.js';
import type { Student } from '../../db/schema/students.js';
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

  const mockGrade: Grade = {
    id: 'grade-1',
    schoolId: school1Id,
    boardId: 'board-1',
    name: 'Grade 10 - Section A',
    code: 'G10-A',
    gradeNumber: 10,
    section: 'A',
    capacity: 30,
    classTeacherId: mockTeacher.id,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  let mockGradesRepo: GradesRepository;
  let mockSubjectsRepo: SubjectsRepository;
  let mockStudentsRepo: StudentsRepository;

  const mockStudent: Student = {
    id: 'student-1',
    schoolId: school1Id,
    boardId: 'board-1',
    gradeId: 'grade-1',
    userId: null,
    admissionNumber: 'ADM-001',
    firstName: 'Bart',
    lastName: 'Simpson',
    dateOfBirth: null,
    gender: 'male',
    email: 'bart@simpson.edu',
    phone: null,
    guardianName: 'Homer Simpson',
    guardianPhone: null,
    guardianEmail: null,
    address: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockTeachersRepo = new TeachersRepository();
    mockSchoolsRepo = new SchoolsRepository();
    mockUsersRepo = new UsersRepository();
    mockTeacherAssignmentsRepo = new TeacherAssignmentsRepository();
    mockGradesRepo = new GradesRepository();
    mockSubjectsRepo = new SubjectsRepository();
    mockStudentsRepo = new StudentsRepository();
    const mockTxRunner = async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
      return await fn({} as any);
    };
    service = new TeachersService(
      mockTeachersRepo,
      mockSchoolsRepo,
      mockUsersRepo,
      mockTeacherAssignmentsRepo,
      mockGradesRepo,
      mockSubjectsRepo,
      mockTxRunner,
      mockStudentsRepo,
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

    it('automatically creates a User account when userId is omitted', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findByEmail').mockResolvedValue(null);
      const userCreateSpy = vi.spyOn(mockUsersRepo, 'create').mockResolvedValue({
        id: 'new-user-id',
        email: 'edna@springfield.edu',
        role: 'teacher',
        schoolId: school1Id,
        firstName: 'Edna',
        lastName: 'Krabappel',
        phone: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      const teacherCreateSpy = vi.spyOn(mockTeachersRepo, 'create').mockResolvedValue(mockTeacher);

      await service.createTeacher(
        school1Id,
        {
          employeeId: 'EMP-001',
          firstName: 'Edna',
          lastName: 'Krabappel',
          email: 'edna@springfield.edu',
          status: 'active',
        },
        school1Id,
        'admin',
      );

      expect(userCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'edna@springfield.edu',
          role: 'teacher',
          schoolId: school1Id,
        }),
        expect.anything(),
      );
      expect(teacherCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user-id',
        }),
        expect.anything(),
      );
    });

    it('throws ConflictError if user with email already exists when auto-creating user', async () => {
      vi.spyOn(mockSchoolsRepo, 'findById').mockResolvedValue(mockSchool);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmployeeId').mockResolvedValue(null);
      vi.spyOn(mockTeachersRepo, 'findBySchoolAndEmail').mockResolvedValue(null);
      vi.spyOn(mockUsersRepo, 'findByEmail').mockResolvedValue(mockUser);

      await expect(
        service.createTeacher(
          school1Id,
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
      ).rejects.toThrow(ConflictError);
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

  describe('getMyAssignedGrades', () => {
    it('returns assigned grades for the resolved teacher', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      const mockGrades = [
        {
          id: 'grade-1',
          name: 'Grade 10 - Section A',
          code: 'G10-A',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: true,
          totalAssignedSubjects: 2,
        },
      ];
      vi.spyOn(mockTeachersRepo, 'findAssignedGradesByTeacherId').mockResolvedValue(mockGrades);

      const result = await service.getMyAssignedGrades(userId1, school1Id);

      expect(result).toEqual(mockGrades);
    });

    it('throws NotFoundError if teacher profile is missing for user', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(null);

      await expect(service.getMyAssignedGrades('unknown-user', school1Id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getTeacherAssignedGrades', () => {
    it('allows super_admin to retrieve assigned grades for any teacher', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      const mockGrades: AssignedGradeResult[] = [
        {
          id: 'grade-1',
          name: 'Grade 10',
          code: 'G10',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: false,
          totalAssignedSubjects: 2,
        },
      ];
      vi.spyOn(mockTeachersRepo, 'findAssignedGradesByTeacherId').mockResolvedValue(mockGrades);

      const result = await service.getTeacherAssignedGrades(mockTeacher.id, null, 'super_admin');

      expect(result).toEqual(mockGrades);
    });

    it('allows teacher to retrieve their own assigned grades', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);
      const mockGrades: AssignedGradeResult[] = [
        {
          id: 'grade-1',
          name: 'Grade 10',
          code: 'G10',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: false,
          totalAssignedSubjects: 2,
        },
      ];
      vi.spyOn(mockTeachersRepo, 'findAssignedGradesByTeacherId').mockResolvedValue(mockGrades);

      const result = await service.getTeacherAssignedGrades(
        mockTeacher.id,
        school1Id,
        'teacher',
        userId1,
      );

      expect(result).toEqual(mockGrades);
    });

    it('throws ForbiddenError if teacher attempts to view another teacher grades', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      await expect(
        service.getTeacherAssignedGrades(mockTeacher.id, school1Id, 'teacher', 'other-user-id'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError if school admin views teacher from another school', async () => {
      vi.spyOn(mockTeachersRepo, 'findById').mockResolvedValue(mockTeacher);

      await expect(
        service.getTeacherAssignedGrades(mockTeacher.id, school2Id, 'admin'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getMyAssignedGradeSubjects', () => {
    const mockGrade: Grade = {
      id: 'grade-1',
      schoolId: school1Id,
      boardId: 'board-1',
      name: 'Grade 10 - Section A',
      code: 'G10-A',
      gradeNumber: 10,
      section: 'A',
      capacity: 30,
      classTeacherId: mockTeacher.id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('returns grade and subjects when teacher is assigned to the grade', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeachersRepo, 'hasTeacherGradeAssignment').mockResolvedValue(true);
      const mockSubjects = [
        {
          id: 'sub-1',
          name: 'Mathematics',
          code: 'MATH101',
          description: 'Math',
          status: 'active',
          totalChapters: 5,
        },
      ];
      vi.spyOn(mockTeachersRepo, 'findAssignedSubjectsByTeacherAndGrade').mockResolvedValue(
        mockSubjects,
      );

      const result = await service.getMyAssignedGradeSubjects(userId1, mockGrade.id);

      expect(result).toEqual({
        grade: {
          id: mockGrade.id,
          name: mockGrade.name,
        },
        subjects: mockSubjects,
      });
    });

    it('throws ForbiddenError if teacher is neither assigned nor class teacher', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue({
        ...mockGrade,
        classTeacherId: 'different-teacher-id',
      });
      vi.spyOn(mockTeachersRepo, 'hasTeacherGradeAssignment').mockResolvedValue(false);

      await expect(service.getMyAssignedGradeSubjects(userId1, mockGrade.id)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('getMyAllAssignedSubjects', () => {
    it('returns distinct subjects taught across all grades', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      const mockSubjects: AssignedSubjectResult[] = [
        {
          id: 'sub-1',
          name: 'Mathematics',
          code: 'MATH',
          description: null,
          status: 'active',
          totalChapters: 5,
        },
      ];
      vi.spyOn(mockTeachersRepo, 'findAllAssignedSubjectsByTeacher').mockResolvedValue(
        mockSubjects,
      );

      const result = await service.getMyAllAssignedSubjects(userId1);

      expect(result).toEqual(mockSubjects);
    });
  });

  describe('getMyAssignedSubjectChapters', () => {
    const mockSubject: Subject = {
      id: 'sub-1',
      schoolId: school1Id,
      name: 'Mathematics',
      code: 'MATH',
      description: 'Core Math',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('returns subject and chapters with material and note counts', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(true);
      const mockChapters = [
        {
          id: 'chap-1',
          chapterNumber: 1,
          title: 'Algebra',
          description: 'Basics',
          status: 'active',
          totalMaterials: 2,
          totalNotes: 1,
        },
      ];
      vi.spyOn(mockTeachersRepo, 'findChaptersBySubject').mockResolvedValue(mockChapters);

      const result = await service.getMyAssignedSubjectChapters(userId1, mockSubject.id);

      expect(result).toEqual({
        subject: {
          id: mockSubject.id,
          name: mockSubject.name,
          code: mockSubject.code,
        },
        chapters: mockChapters,
      });
    });

    it('throws ForbiddenError if teacher does not teach this subject', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockSubjectsRepo, 'findById').mockResolvedValue(mockSubject);
      vi.spyOn(mockTeachersRepo, 'hasTeacherSubjectAssignment').mockResolvedValue(false);

      await expect(service.getMyAssignedSubjectChapters(userId1, mockSubject.id)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('getMyAssignedGradeStudents', () => {
    it('returns students for an assigned grade', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue(mockGrade);
      vi.spyOn(mockTeachersRepo, 'hasTeacherGradeAssignment').mockResolvedValue(true);
      vi.spyOn(mockStudentsRepo, 'listByGrade').mockResolvedValue([mockStudent]);

      const result = await service.getMyAssignedGradeStudents(userId1, mockGrade.id, {
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe(mockStudent.id);
    });

    it('throws ForbiddenError if teacher is not assigned to grade and not class teacher', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockGradesRepo, 'findById').mockResolvedValue({
        ...mockGrade,
        classTeacherId: null,
      });
      vi.spyOn(mockTeachersRepo, 'hasTeacherGradeAssignment').mockResolvedValue(false);

      await expect(service.getMyAssignedGradeStudents(userId1, mockGrade.id)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('getMyAllAssignedStudents', () => {
    it('returns students across all assigned grades', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'findAssignedGradesByTeacherId').mockResolvedValue([
        {
          id: 'grade-1',
          name: 'Grade 10',
          code: 'G10',
          gradeNumber: 10,
          section: 'A',
          boardId: 'board-1',
          boardName: 'CBSE',
          isClassTeacher: false,
          totalAssignedSubjects: 1,
        },
      ]);
      vi.spyOn(mockStudentsRepo, 'listByGradeIds').mockResolvedValue([mockStudent]);

      const result = await service.getMyAllAssignedStudents(userId1, { limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe(mockStudent.id);
    });

    it('returns empty list if teacher has no assigned grades', async () => {
      vi.spyOn(mockTeachersRepo, 'findByUserId').mockResolvedValue(mockTeacher);
      vi.spyOn(mockTeachersRepo, 'findAssignedGradesByTeacherId').mockResolvedValue([]);

      const result = await service.getMyAllAssignedStudents(userId1, { limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasMore).toBe(false);
    });
  });
});
