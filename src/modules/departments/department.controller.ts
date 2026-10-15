import { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  listAllDepartments,
  listPublicDepartments,
  updateDepartment,
} from "./department.service";
import {
  createDepartmentSchema,
  managerInviteTechnicianSchema,
  updateDepartmentSchema,
} from "./department.validation";
import {
  inviteStaff,
  listMyDepartmentTechnicians,
  removeTechnician,
  resendInvite,
} from "./staffInvite.service";

export const listDepartmentsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const departments = await listPublicDepartments();
    res
      .status(200)
      .json(successResponse("Departments retrieved successfully", departments));
  } catch (error) {
    next(error);
  }
};

const getParamId = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== "string") throw new AppError(`Invalid ${name}`, 400);
  return value;
};

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError("Unauthorized", 401);
  return req.user;
};

export const createDepartmentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await createDepartment(
      createDepartmentSchema.parse(req.body),
      user.userId,
    );
    res
      .status(201)
      .json(successResponse("Department created successfully", result));
  } catch (error) {
    next(error);
  }
};

export const listAllDepartmentsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const result = await listAllDepartments(includeDeleted);
    res
      .status(200)
      .json(successResponse("Departments retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const getDepartmentByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getDepartmentById(getParamId(req, "id"));
    res
      .status(200)
      .json(successResponse("Department retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const updateDepartmentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await updateDepartment(
      getParamId(req, "id"),
      updateDepartmentSchema.parse(req.body),
      user.userId,
    );
    res
      .status(200)
      .json(successResponse("Department updated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const deleteDepartmentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await deleteDepartment(getParamId(req, "id"), user.userId);
    res
      .status(200)
      .json(successResponse("Department deleted successfully", result));
  } catch (error) {
    next(error);
  }
};

export const inviteTechnicianController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const input = managerInviteTechnicianSchema.parse(req.body);
    const result = await inviteStaff({
      inviter: user,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: Role.TECHNICIAN,
    });
    res
      .status(201)
      .json(successResponse("Technician invited successfully", result));
  } catch (error) {
    next(error);
  }
};

export const removeTechnicianController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const technicianId = getParamId(req, "id");
    const result = await removeTechnician({
      inviter: user,
      technicianId,
    });

    if (result.blocked) {
      res.status(409).json({
        success: false,
        message: "Reassign this technician's active complaints first",
        data: {
          blockingComplaintIds: result.blockingComplaintIds,
        },
      });
      return;
    }

    res.status(200).json(
      successResponse("Technician removed from department successfully", {
        technicianId: result.technicianId,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const resendInviteManagerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const targetUserId = getParamId(req, "id");
    const result = await resendInvite({
      inviter: user,
      userId: targetUserId,
    });
    res
      .status(200)
      .json(successResponse("Invitation email resent successfully", result));
  } catch (error) {
    next(error);
  }
};

export const listMyDepartmentTechniciansController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const result = await listMyDepartmentTechnicians(user.userId);
    res
      .status(200)
      .json(
        successResponse(
          "Department technicians retrieved successfully",
          result,
        ),
      );
  } catch (error) {
    next(error);
  }
};
