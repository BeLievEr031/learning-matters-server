import { Router } from 'express';
import { notesController } from './notes.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { handleSingleUpload } from '../../../middleware/upload.js';
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  chapterNoteParamsSchema,
} from './notes.schemas.js';
import { chapterIdParamSchema } from '../materials/materials.schemas.js';

export const chapterNotesRouter: Router = Router({ mergeParams: true });

// Create note under chapter
chapterNotesRouter.post(
  '/',
  authenticate,
  authorize('teacher', 'class_teacher', 'admin', 'super_admin'),
  handleSingleUpload('file'),
  validate({ params: chapterIdParamSchema, body: createNoteSchema }),
  notesController.createNote,
);

// List notes for chapter
chapterNotesRouter.get(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: chapterIdParamSchema, query: listNotesQuerySchema }),
  notesController.listNotesByChapter,
);

// Get single note by ID
chapterNotesRouter.get(
  '/:noteId',
  authenticate,
  authorize('super_admin', 'admin', 'principal', 'class_teacher', 'teacher', 'student'),
  validate({ params: chapterNoteParamsSchema }),
  notesController.getNoteById,
);

// Update note
chapterNotesRouter.patch(
  '/:noteId',
  authenticate,
  authorize('teacher', 'class_teacher', 'admin', 'super_admin'),
  handleSingleUpload('file'),
  validate({ params: chapterNoteParamsSchema, body: updateNoteSchema }),
  notesController.updateNote,
);

// Soft-delete note
chapterNotesRouter.delete(
  '/:noteId',
  authenticate,
  authorize('teacher', 'class_teacher', 'admin', 'super_admin'),
  validate({ params: chapterNoteParamsSchema }),
  notesController.deleteNote,
);
