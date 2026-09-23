import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  createCategory,
  deleteCategory,
  listCategoriesForDepartment,
  updateCategory,
} from "./category.service";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const getParamId = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== "string") throw new AppError(`Invalid ${name}`, 400);
  return value;
};

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError("Unauthorized", 401);
  return req.user;
};

export const listCategoriesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await listCategoriesForDepartment(
      getParamId(req, "departmentId"),
    );
    res
      .status(200)
      .json(successResponse("Categories retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const createCategoryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await createCategory(
      getParamId(req, "departmentId"),
      createCategorySchema.parse(req.body),
      user.userId,
    );
    res
      .status(201)
      .json(successResponse("Category created successfully", result));
  } catch (error) {
    next(error);
  }
};

export const updateCategoryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await updateCategory(
      getParamId(req, "id"),
      updateCategorySchema.parse(req.body),
      user.userId,
    );
    res
      .status(200)
      .json(successResponse("Category updated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await deleteCategory(getParamId(req, "id"), user.userId);
    res
      .status(200)
      .json(successResponse("Category deleted successfully", result));
  } catch (error) {
    next(error);
  }
};
