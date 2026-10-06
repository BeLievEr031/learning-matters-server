import type { Request, Response, NextFunction } from 'express';
import { schoolsService, type SchoolsService } from './schools.service.js';
import type { CreateSchoolInput, UpdateSchoolInput, ListSchoolsQuery } from './schools.schemas.js';

export class SchoolsController {
  constructor(private readonly service: SchoolsService = schoolsService) {}

  createSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const school = await this.service.createSchool(req.body as CreateSchoolInput);
      res.status(201).json({ data: school });
    } catch (err) {
      next(err);
    }
  };

  listSchools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listSchools(req.query as unknown as ListSchoolsQuery);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getSchoolById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const school = await this.service.getSchoolById(req.params.schoolId as string);
      res.status(200).json({ data: school });
    } catch (err) {
      next(err);
    }
  };

  updateSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const school = await this.service.updateSchool(
        req.params.schoolId as string,
        req.body as UpdateSchoolInput,
      );
      res.status(200).json({ data: school });
    } catch (err) {
      next(err);
    }
  };

  deleteSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteSchool(req.params.schoolId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const schoolsController = new SchoolsController();
