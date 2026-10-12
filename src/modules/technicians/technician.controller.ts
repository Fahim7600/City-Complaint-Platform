import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  getTechnicianPerformance,
  updateAvailability,
} from "./technician.service";
import { updateAvailabilitySchema } from "./technician.validation";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError("Unauthorized", 401);
  return req.user;
};

export const updateAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const body = updateAvailabilitySchema.parse(req.body);
    const result = await updateAvailability(user.userId, body);
    const statusText = result.isAvailable ? "available" : "unavailable";
    res
      .status(200)
      .json(
        successResponse(
          `Technician availability updated to ${statusText}`,
          result,
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const getPerformanceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await getTechnicianPerformance(user.userId);
    res
      .status(200)
      .json(
        successResponse(
          "Technician performance metrics retrieved successfully",
          result,
        ),
      );
  } catch (error) {
    next(error);
  }
};
