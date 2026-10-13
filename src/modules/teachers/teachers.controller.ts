import type { Request, Response, NextFunction } from 'express';
import { teachersService, type TeachersService } from './teachers.service.js';
import type { CreateTeacherInput, UpdateTeacherInput } from './teachers.schemas.js';
import { UnauthorizedError } from '../../lib/app-error.js';

export class TeachersController {
  constructor(private readonly service: TeachersService = teachersService) {}

  createTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.params.schoolId as string;
      const teacher = await this.service.createTeacher(
        schoolId,
        req.body as CreateTeacherInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: teacher });
    } catch (err) {
      next(err);
    }
  };

  listTeachersBySchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.params.schoolId as string;
      const result = await this.service.listTeachersBySchool(
        schoolId,
        req.query,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getTeacherById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.params.teacherId as string;
      const teacher = await this.service.getTeacherById(
        teacherId,
        req.user?.schoolId,
        req.user?.role,
        req.user?.id,
      );
      res.status(200).json({ data: teacher });
    } catch (err) {
      next(err);
    }
  };

  updateTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.params.teacherId as string;
      const teacher = await this.service.updateTeacher(
        teacherId,
        req.body as UpdateTeacherInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: teacher });
    } catch (err) {
      next(err);
    }
  };

  deleteTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teacherId = req.params.teacherId as string;
      await this.service.deleteTeacher(teacherId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getMyAssignedGrades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const grades = await this.service.getMyAssignedGrades(req.user.id, req.user.schoolId);
      res.status(200).json({ data: grades });
    } catch (err) {
      next(err);
    }
  };

  getTeacherAssignedGrades = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const teacherId = req.params.teacherId as string;
      const grades = await this.service.getTeacherAssignedGrades(
        teacherId,
        req.user?.schoolId,
        req.user?.role,
        req.user?.id,
      );
      res.status(200).json({ data: grades });
    } catch (err) {
      next(err);
    }
  };

  getMyAssignedGradeSubjects = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const gradeId = req.params.gradeId as string;
      const result = await this.service.getMyAssignedGradeSubjects(req.user.id, gradeId);
      res.status(200).json({ data: result, ...result });
    } catch (err) {
      next(err);
    }
  };

  getMyAllAssignedSubjects = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const subjects = await this.service.getMyAllAssignedSubjects(req.user.id);
      res.status(200).json({ data: subjects });
    } catch (err) {
      next(err);
    }
  };

  getMyAssignedSubjectChapters = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const subjectId = req.params.subjectId as string;
      const result = await this.service.getMyAssignedSubjectChapters(req.user.id, subjectId);
      res.status(200).json({ data: result, ...result });
    } catch (err) {
      next(err);
    }
  };
}

export const teachersController = new TeachersController();
