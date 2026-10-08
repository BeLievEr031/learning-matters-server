import type { Request, Response, NextFunction } from 'express';
import {
  teacherAssignmentsService,
  type TeacherAssignmentsService,
} from './teacher-assignments.service.js';
import type {
  CreateTeacherAssignmentInput,
  UpdateTeacherAssignmentInput,
} from './teacher-assignments.schemas.js';

export class TeacherAssignmentsController {
  constructor(private readonly service: TeacherAssignmentsService = teacherAssignmentsService) {}

  createAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignment = await this.service.createAssignment(
        req.body as CreateTeacherAssignmentInput,
        req.user?.id,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: assignment });
    } catch (err) {
      next(err);
    }
  };

  listAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listAssignments(
        req.query,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getAssignmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentId = req.params.assignmentId as string;
      const assignment = await this.service.getAssignmentById(
        assignmentId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: assignment });
    } catch (err) {
      next(err);
    }
  };

  getAssignmentsByTeacher = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const teacherId = req.params.teacherId as string;
      const assignments = await this.service.getAssignmentsByTeacher(
        teacherId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: assignments });
    } catch (err) {
      next(err);
    }
  };

  getTeachersByGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const teachers = await this.service.getTeachersByGrade(
        gradeId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: teachers });
    } catch (err) {
      next(err);
    }
  };

  getTeachersBySubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      const teachers = await this.service.getTeachersBySubject(
        subjectId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: teachers });
    } catch (err) {
      next(err);
    }
  };

  updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentId = req.params.assignmentId as string;
      const assignment = await this.service.updateAssignment(
        assignmentId,
        req.body as UpdateTeacherAssignmentInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: assignment });
    } catch (err) {
      next(err);
    }
  };

  deleteAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentId = req.params.assignmentId as string;
      await this.service.deleteAssignment(assignmentId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const teacherAssignmentsController = new TeacherAssignmentsController();
