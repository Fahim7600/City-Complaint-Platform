import type { NextFunction, Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  deactivateUser,
  getDashboardStats,
  listAuditLogs,
  listUsers,
  overrideUserRoleAndDepartment,
  reactivateUser,
} from "./admin.service";
import { auditLogQuerySchema, listUsersQuerySchema } from "./admin.validation";

const getParamId = (req: Request): string => {
  const { id } = req.params;
  if (typeof id !== "string") throw new AppError("Invalid ID parameter", 400);
  return id;
};

const requireAdmin = (req: Request) => {
  if (!req.user) throw new AppError("Unauthorized", 401);
  return req.user;
};

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await listUsers(query);
    res
      .status(200)
      .json(successResponse("Users retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const overrideUserRoleAndDepartmentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const adminUser = requireAdmin(req);
    const result = await overrideUserRoleAndDepartment(
      adminUser,
      getParamId(req),
      req.body,
    );
    res
      .status(200)
      .json(successResponse("User role updated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const deactivateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await deactivateUser(requireAdmin(req), getParamId(req));
    res
      .status(200)
      .json(successResponse("User deactivated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const reactivateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reactivateUser(requireAdmin(req), getParamId(req));
    res
      .status(200)
      .json(successResponse("User reactivated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const getDashboardStatsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getDashboardStats();
    res
      .status(200)
      .json(
        successResponse("Dashboard statistics retrieved successfully", result),
      );
  } catch (error) {
    next(error);
  }
};

export const listAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = auditLogQuerySchema.parse(req.query);
    const result = await listAuditLogs(query);
    res
      .status(200)
      .json(successResponse("Audit logs retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};
