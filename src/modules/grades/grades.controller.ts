import type { Request, Response, NextFunction } from 'express';
import { gradesService, type GradesService } from './grades.service.js';
import type {
  CreateGradeInput,
  UpdateGradeInput,
  ListGradesQuery,
  AssignClassTeacherInput,
} from './grades.schemas.js';

export class GradesController {
  constructor(private readonly service: GradesService = gradesService) {}

  createGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.boardId as string;
      const grade = await this.service.createGrade(
        boardId,
        req.body as CreateGradeInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: grade });
    } catch (err) {
      next(err);
    }
  };

  listGrades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.boardId as string;
      const result = await this.service.listGradesByBoard(
        boardId,
        req.query as unknown as ListGradesQuery,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getGradeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const grade = await this.service.getGradeById(gradeId, req.user?.schoolId, req.user?.role);
      res.status(200).json({ data: grade });
    } catch (err) {
      next(err);
    }
  };

  updateGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const grade = await this.service.updateGrade(
        gradeId,
        req.body as UpdateGradeInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: grade });
    } catch (err) {
      next(err);
    }
  };

  deleteGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      await this.service.deleteGrade(gradeId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  assignClassTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const body = req.body as AssignClassTeacherInput;
      const grade = await this.service.assignClassTeacher(
        gradeId,
        body.teacherId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: grade });
    } catch (err) {
      next(err);
    }
  };

  getClassTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const teacher = await this.service.getClassTeacher(
        gradeId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: teacher });
    } catch (err) {
      next(err);
    }
  };
}

export const gradesController = new GradesController();
