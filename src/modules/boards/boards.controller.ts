import type { Request, Response, NextFunction } from 'express';
import { boardsService, type BoardsService } from './boards.service.js';
import type { CreateBoardInput, UpdateBoardInput, ListBoardsQuery } from './boards.schemas.js';

export class BoardsController {
  constructor(private readonly service: BoardsService = boardsService) {}

  createBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.params.schoolId as string;
      const board = await this.service.createBoard(schoolId, req.body as CreateBoardInput);
      res.status(201).json({ data: board });
    } catch (err) {
      next(err);
    }
  };

  listBoards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.params.schoolId as string;
      const result = await this.service.listBoardsBySchool(
        schoolId,
        req.query as unknown as ListBoardsQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getBoardById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.boardId as string;
      const board = await this.service.getBoardById(boardId, req.user?.schoolId, req.user?.role);
      res.status(200).json({ data: board });
    } catch (err) {
      next(err);
    }
  };

  updateBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.boardId as string;
      const board = await this.service.updateBoard(
        boardId,
        req.body as UpdateBoardInput,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: board });
    } catch (err) {
      next(err);
    }
  };

  deleteBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.boardId as string;
      await this.service.deleteBoard(boardId, req.user?.schoolId, req.user?.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const boardsController = new BoardsController();
