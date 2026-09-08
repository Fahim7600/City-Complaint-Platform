import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import { config } from "../config/env";
import { errorResponse } from "../utils/response";

export interface CustomError extends Error {
  statusCode?: number;
  errors?: unknown;
}

export const errorHandler: ErrorRequestHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error details server-side
  console.error(`[Error] ${statusCode} - ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Hide stack trace and sensitive details in production
  const errorDetails =
    config.NODE_ENV === "production"
      ? undefined
      : err.errors ||
        (err.stack ? { stack: err.stack.split("\n") } : undefined);

  res.status(statusCode).json(errorResponse(message, errorDetails));
};
