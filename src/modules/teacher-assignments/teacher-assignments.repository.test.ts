import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  teacherAssignmentsRepository,
  type TeacherAssignmentDetail,
} from './teacher-assignments.repository.js';
import { db } from '../../db/pool.js';
import type { TeacherAssignment } from '../../db/schema/teacher-assignments.js';

describe('TeacherAssignmentsRepository', () => {
  const mockAssignment: TeacherAssignment = {
    id: '66666666-6666-4666-a666-666666666666',
    schoolId: '11111111-1111-4111-a111-111111111111',
    teacherId: '33333333-3333-4333-a333-333333333333',
    gradeId: '44444444-4444-4444-a444-444444444444',
    subjectId: '55555555-5555-4555-a555-555555555555',
    assignedBy: '99999999-9999-4999-a999-999999999999',
    status: 'active',
    effectiveDate: new Date('2026-02-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-01-01T12:00:00.000Z'),
    deletedAt: null,
  };

  const mockDetail: TeacherAssignmentDetail = {
    ...mockAssignment,
    teacherFirstName: 'Edna',
    teacherLastName: 'Krabappel',
    teacherEmail: 'edna@springfield.edu',
    teacherEmployeeId: 'EMP-001',
    gradeName: 'Grade 10 - Section A',
    gradeCode: 'G10-A',
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('returns assignment with joined details when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockDetail]),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.findById(mockAssignment.id);
      expect(result).toEqual(mockDetail);
    });

    it('returns null when assignment not found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findByTeacherGradeSubject', () => {
    it('returns assignment by teacher, grade, and subject', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAssignment]),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.findByTeacherGradeSubject(
        mockAssignment.teacherId,
        mockAssignment.gradeId,
        mockAssignment.subjectId,
      );
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('create', () => {
    it('creates and returns teacher assignment', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAssignment]),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.create({
        schoolId: mockAssignment.schoolId,
        teacherId: mockAssignment.teacherId,
        gradeId: mockAssignment.gradeId,
        subjectId: mockAssignment.subjectId,
        assignedBy: mockAssignment.assignedBy,
        status: 'active',
        effectiveDate: mockAssignment.effectiveDate,
      });

      expect(result).toEqual(mockAssignment);
    });

    it('throws error when insert returns empty result', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await expect(
        teacherAssignmentsRepository.create({
          schoolId: mockAssignment.schoolId,
          teacherId: mockAssignment.teacherId,
          gradeId: mockAssignment.gradeId,
          subjectId: mockAssignment.subjectId,
        }),
      ).rejects.toThrow('Failed to create teacher assignment record');
    });
  });

  describe('update', () => {
    it('updates assignment status and effectiveDate', async () => {
      const updated = { ...mockAssignment, status: 'inactive' as const };
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.update(mockAssignment.id, {
        status: 'inactive',
        effectiveDate: new Date('2026-06-01T00:00:00.000Z'),
      });

      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('soft deletes assignment and returns true on success', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockAssignment.id }]),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.softDelete(mockAssignment.id);
      expect(result).toBe(true);
    });
  });

  describe('list', () => {
    it('lists assignments with filter and sort options', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([mockDetail]),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.list(
        10,
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: mockAssignment.id,
        },
        {
          schoolId: mockAssignment.schoolId,
          teacherId: mockAssignment.teacherId,
          gradeId: mockAssignment.gradeId,
          subjectId: mockAssignment.subjectId,
          status: 'active',
          search: 'Edna',
          sortBy: 'effectiveDate',
          sortOrder: 'asc',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('applies sortBy status branch in list', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([mockDetail]),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.list(10, undefined, {
        sortBy: 'status',
        sortOrder: 'desc',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('listByTeacher, listByGrade, listBySubject', () => {
    it('lists assignments by teacher', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([mockDetail]),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.listByTeacher(
        mockAssignment.teacherId,
        'active',
      );
      expect(result).toHaveLength(1);
    });

    it('lists assignments by grade', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([mockDetail]),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.listByGrade(
        mockAssignment.gradeId,
        'active',
      );
      expect(result).toHaveLength(1);
    });

    it('lists assignments by subject', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([mockDetail]),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.listBySubject(
        mockAssignment.subjectId,
        'active',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('active assignment checks', () => {
    it('checks active assignments by grade', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.hasActiveAssignmentsByGrade(
        mockAssignment.gradeId,
      );
      expect(result).toBe(true);
    });

    it('checks active assignments by teacher', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.hasActiveAssignmentsByTeacher(
        mockAssignment.teacherId,
      );
      expect(result).toBe(true);
    });

    it('checks active assignments by subject', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      } as never);

      const result = await teacherAssignmentsRepository.hasActiveAssignmentsBySubject(
        mockAssignment.subjectId,
      );
      expect(result).toBe(true);
    });
  });
});
