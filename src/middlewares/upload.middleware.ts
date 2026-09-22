import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../modules/auth/auth.service";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDF files are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
});

export const handleUploadError = (
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      next(new AppError("File too large, max 10MB", 400));
      return;
    }
    if (
      err.code === "LIMIT_UNEXPECTED_FILE" ||
      err.code === "LIMIT_FILE_COUNT"
    ) {
      next(new AppError("Maximum 10 files per upload", 400));
      return;
    }
    next(new AppError(`Upload error: ${err.message}`, 400));
    return;
  }

  if (err instanceof Error) {
    next(new AppError(err.message, 400));
    return;
  }

  next(err);
};
