import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  getDepartmentTechnicians,
  getPublicCategories,
  getPublicDepartments,
  getPublicPremiumInfo,
  getPublicStats,
} from "./public.service";

export const getPublicDepartmentsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const departments = await getPublicDepartments();
    res.setHeader("Cache-Control", "public, max-age=300");
    res
      .status(200)
      .json(successResponse("Departments retrieved successfully", departments));
  } catch (error) {
    next(error);
  }
};

export const getDepartmentTechniciansController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError("Invalid department ID", 400);
    }
    const technicians = await getDepartmentTechnicians(id);
    res
      .status(200)
      .json(
        successResponse(
          "Department technicians retrieved successfully",
          technicians,
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const getPublicCategoriesController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await getPublicCategories();
    res.setHeader("Cache-Control", "public, max-age=300");
    res
      .status(200)
      .json(successResponse("Categories retrieved successfully", categories));
  } catch (error) {
    next(error);
  }
};

export const getPublicStatsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await getPublicStats();
    res.setHeader("Cache-Control", "public, max-age=300");
    res
      .status(200)
      .json(successResponse("Platform statistics retrieved successfully", stats));
  } catch (error) {
    next(error);
  }
};

export const getPublicPremiumInfoController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const premiumInfo = await getPublicPremiumInfo();
    res.setHeader("Cache-Control", "public, max-age=300");
    res
      .status(200)
      .json(
        successResponse("Premium tier information retrieved successfully", premiumInfo),
      );
  } catch (error) {
    next(error);
  }
};
