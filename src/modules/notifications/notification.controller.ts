import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  listMyNotifications,
  markAllAsRead,
  markAsRead,
} from "./notification.service";
import { listNotificationsQuerySchema } from "./notification.validation";

export const listMyNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await listMyNotifications(req.user.userId, query);
    res
      .status(200)
      .json(successResponse("Notifications retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const markAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = req.params.id;
    if (typeof id !== "string")
      throw new AppError("Invalid notification ID", 400);
    const result = await markAsRead(req.user.userId, id);
    res
      .status(200)
      .json(successResponse("Notification marked as read", result));
  } catch (error) {
    next(error);
  }
};

export const markAllAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await markAllAsRead(req.user.userId);
    res
      .status(200)
      .json(successResponse("All notifications marked as read", result));
  } catch (error) {
    next(error);
  }
};
