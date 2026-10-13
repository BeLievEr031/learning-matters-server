import type { Request, Response, NextFunction } from 'express';
import { notesService, type NotesService } from './notes.service.js';
import type { CreateNoteInput, UpdateNoteInput } from './notes.schemas.js';

export class NotesController {
  constructor(private readonly service: NotesService = notesService) {}

  createNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const note = await this.service.createNote(
        chapterId,
        req.body as CreateNoteInput,
        req.file,
        req.user?.id,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(201).json({ data: note });
    } catch (err) {
      next(err);
    }
  };

  listNotesByChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const notes = await this.service.listNotesByChapter(
        chapterId,
        req.query,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: notes });
    } catch (err) {
      next(err);
    }
  };

  getNoteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const noteId = req.params.noteId as string;
      const note = await this.service.getNoteById(
        chapterId,
        noteId,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: note });
    } catch (err) {
      next(err);
    }
  };

  updateNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const noteId = req.params.noteId as string;
      const updated = await this.service.updateNote(
        chapterId,
        noteId,
        req.body as UpdateNoteInput,
        req.file,
        req.user?.id,
        req.user?.schoolId,
        req.user?.role,
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  deleteNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapterId = req.params.chapterId as string;
      const noteId = req.params.noteId as string;
      await this.service.deleteNote(
        chapterId,
        noteId,
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

export const notesController = new NotesController();
