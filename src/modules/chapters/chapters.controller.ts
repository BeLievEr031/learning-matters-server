import type { Request, Response, NextFunction } from 'express';
import { chaptersService, type ChaptersService } from './chapters.service.js';
import type {
  CreateChapterInput,
  UpdateChapterInput,
  ReorderChaptersInput,
} from './chapters.schemas.js';

export class ChaptersController {
  constructor(private readonly service: ChaptersService = chaptersService) {}

  createChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      const chapter = await this.service.createChapter(
        subjectId,
        req.body as CreateChapterInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: chapter });
    } catch (err) {
      next(err);
    }
  };

  listChaptersBySubject = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      const result = await this.service.listChaptersBySubject(
        subjectId,
        req.query,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getChapterById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const chapter = await this.service.getChapterById(
        chapterId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: chapter });
    } catch (err) {
      next(err);
    }
  };

  updateChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const chapter = await this.service.updateChapter(
        chapterId,
        req.body as UpdateChapterInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: chapter });
    } catch (err) {
      next(err);
    }
  };

  deleteChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      await this.service.deleteChapter(chapterId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  reorderChapters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subjectId = req.params.subjectId as string;
      const chapters = await this.service.reorderChapters(
        subjectId,
        req.body as ReorderChaptersInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: chapters });
    } catch (err) {
      next(err);
    }
  };
}

export const chaptersController = new ChaptersController();
