import type { Request, Response, NextFunction } from 'express';
import { teachersService, type TeachersService } from './teachers.service.js';
import type { CreateTeacherInput, UpdateTeacherInput } from './teachers.schemas.js';

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
}

export const teachersController = new TeachersController();
