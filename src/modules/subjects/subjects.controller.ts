import type { Request, Response, NextFunction } from 'express';
import { subjectsService, type SubjectsService } from './subjects.service.js';
import type { AssignOrCreateSubjectInput, UpdateSubjectInput } from './subjects.schemas.js';

export class SubjectsController {
  constructor(private readonly service: SubjectsService = subjectsService) {}

  assignOrCreateSubject = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const result = await this.service.assignOrCreateSubject(
        gradeId,
        req.body as AssignOrCreateSubjectInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listSubjectsByGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const result = await this.service.listSubjectsByGrade(
        gradeId,
        req.query,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getSubjectById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      const subject = await this.service.getSubjectById(
        subjectId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: subject });
    } catch (err) {
      next(err);
    }
  };

  updateSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      const subject = await this.service.updateSubject(
        subjectId,
        req.body as UpdateSubjectInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: subject });
    } catch (err) {
      next(err);
    }
  };

  removeGradeAssignment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const subjectId = req.params.subjectId as string;
      await this.service.removeGradeAssignment(
        gradeId,
        subjectId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  deleteSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      await this.service.deleteSubject(subjectId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const subjectsController = new SubjectsController();
