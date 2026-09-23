import type { NextFunction, Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  decideApplication,
  listPendingApplications,
} from "./staffApplication.service";

const getParamId = (req: Request): string => {
  const { id } = req.params;
  if (typeof id !== "string") throw new AppError("Invalid ID parameter", 400);
  return id;
};

const getQueryNumber = (
  value: unknown,
  fallback: number,
  name: string,
): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`Invalid ${name} query parameter`, 400);
  }
  return parsed;
};

export const listPendingApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }
    const result = await listPendingApplications(req.user, {
      page: getQueryNumber(req.query.page, 1, "page"),
      limit: getQueryNumber(req.query.limit, 10, "limit"),
    });
    res
      .status(200)
      .json(
        successResponse("Pending applications retrieved successfully", result),
      );
  } catch (error) {
    next(error);
  }
};

export const decideApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }
    const result = await decideApplication(
      req.user,
      getParamId(req),
      req.body.decision,
      req.body.reason,
    );
    res
      .status(200)
      .json(successResponse("Staff application decided successfully", result));
  } catch (error) {
    next(error);
  }
};
