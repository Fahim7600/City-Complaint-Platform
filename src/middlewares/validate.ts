import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import type { CustomError } from "./errorHandler";

export const validate = (schema: ZodSchema) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const result = await schema.safeParseAsync(req.body);

    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      const error: CustomError = new Error("Validation failed");
      error.statusCode = 400;
      error.errors = fieldErrors;

      return next(error);
    }

    req.body = result.data;
    return next();
  };
};
