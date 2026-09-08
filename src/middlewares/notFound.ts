import type { Request, Response } from "express";
import { errorResponse } from "../utils/response";

export const notFoundHandler = (req: Request, res: Response): void => {
  res
    .status(404)
    .json(errorResponse(`Route not found: ${req.method} ${req.originalUrl}`));
};
