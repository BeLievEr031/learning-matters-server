import type { Request, Response, NextFunction } from 'express';
import { materialsService, type MaterialsService } from './materials.service.js';
import type { CreateMaterialInput } from './materials.schemas.js';

export class MaterialsController {
  constructor(private readonly service: MaterialsService = materialsService) {}

  createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const material = await this.service.createMaterial(
        chapterId,
        req.body as CreateMaterialInput,
        req.file,
        req.user?.id,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: material });
    } catch (err) {
      next(err);
    }
  };

  listMaterialsByChapter = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const materials = await this.service.listMaterialsByChapter(
        chapterId,
        req.query,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: materials });
    } catch (err) {
      next(err);
    }
  };

  getMaterialById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const materialId = req.params.materialId as string;
      const material = await this.service.getMaterialById(
        chapterId,
        materialId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: material });
    } catch (err) {
      next(err);
    }
  };

  deleteMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const materialId = req.params.materialId as string;
      await this.service.deleteMaterial(
        chapterId,
        materialId,
        req.user?.id,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const materialsController = new MaterialsController();
