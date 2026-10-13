import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../lib/app-error.js';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../config/constants.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_ROOT)) {
      fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    }
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now().toString();
    const randomPart = Math.round(Math.random() * 1e9).toString();
    const uniqueSuffix = `${timestamp}-${randomPart}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Invalid file type: ${file.mimetype}. Allowed types: PDF, Word, PowerPoint, PNG, JPEG, WEBP.`,
      ),
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
  },
  fileFilter,
});

/**
 * Express wrapper for optional single file upload that normalizes multer errors to AppError.
 */
export function handleSingleUpload(fieldName = 'file') {
  const upload = uploadMiddleware.single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = String(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024));
          next(new BadRequestError(`File exceeds maximum permitted size of ${maxMb}MB`));
          return;
        }
        next(new BadRequestError(err.message));
        return;
      }

      next(err);
    });
  };
}
