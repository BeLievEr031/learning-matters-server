import type { Request, Response, NextFunction } from 'express';
import { studentsService, type StudentsService } from './students.service.js';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  TransferStudentInput,
} from './students.schemas.js';

export class StudentsController {
  constructor(private readonly service: StudentsService = studentsService) {}

  createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const student = await this.service.createStudent(
        gradeId,
        req.body as CreateStudentInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: student });
    } catch (err) {
      next(err);
    }
  };

  listStudentsByGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gradeId = req.params.gradeId as string;
      const result = await this.service.listStudentsByGrade(
        gradeId,
        req.query,
        req.user?.schoolId,
        req.user?.role,
        req.user?.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;
      const student = await this.service.getStudentById(
        studentId,
        req.user?.schoolId,
        req.user?.role,
        req.user?.id,
      );
      res.status(200).json({ data: student });
    } catch (err) {
      next(err);
    }
  };

  updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;
      const student = await this.service.updateStudent(
        studentId,
        req.body as UpdateStudentInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: student });
    } catch (err) {
      next(err);
    }
  };

  transferStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;
      const student = await this.service.transferStudent(
        studentId,
        req.body as TransferStudentInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: student });
    } catch (err) {
      next(err);
    }
  };

  deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;
      await this.service.deleteStudent(studentId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const studentsController = new StudentsController();
