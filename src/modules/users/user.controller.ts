import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError, REFRESH_COOKIE_NAME } from "../auth/auth.service";
import { changePassword, getMe, updateProfile } from "./user.service";

export const getMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }
    const result = await getMe(userId);
    res
      .status(200)
      .json(successResponse("Profile retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const updateProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }
    const result = await updateProfile(userId, req.body);
    res
      .status(200)
      .json(successResponse("Profile updated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const changePasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }
    const result = await changePassword(userId, req.body);
    // Clear refresh token cookie since all sessions were revoked
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
    res.status(200).json(successResponse(result.message));
  } catch (error) {
    next(error);
  }
};
