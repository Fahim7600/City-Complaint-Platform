import type { NextFunction, Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import { createReview, getReview, getTechnicianRating } from "./review.service";

const getParam = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new AppError(`Invalid ${name} parameter`, 400);
  }
  return value;
};

export const createReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await createReview(
      req.user,
      getParam(req, "complaintId"),
      req.body,
    );
    res
      .status(201)
      .json(successResponse("Review submitted successfully", result));
  } catch (error) {
    next(error);
  }
};

export const getReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await getReview(req.user, getParam(req, "complaintId"));
    res
      .status(200)
      .json(successResponse("Review retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const getTechnicianRatingController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await getTechnicianRating(getParam(req, "id"));
    res
      .status(200)
      .json(
        successResponse("Technician rating retrieved successfully", result),
      );
  } catch (error) {
    next(error);
  }
};
