import { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  assignTechnician,
  cancelComplaint,
  createComplaint,
  getComplaintById,
  listComplaints,
  searchComplaints,
  softDeleteComplaint,
  updateComplaint,
  updateStatus,
} from "./complaint.service";
import {
  type ReTriageInput,
  type UpdateComplaintInput,
  listQuerySchema,
  reTriageSchema,
  updateComplaintSchema,
} from "./complaint.validation";

const getParamId = (req: Request): string => {
  const { id } = req.params;
  if (typeof id === "string") return id;
  if (Array.isArray(id)) return id[0];
  throw new AppError("Invalid ID parameter", 400);
};

export const createComplaintHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    const result = await createComplaint(userId, req.body);
    res
      .status(201)
      .json(successResponse("Complaint created successfully", result));
  } catch (error) {
    next(error);
  }
};

export const listComplaintsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const query = listQuerySchema.parse(req.query);

    const result = await listComplaints(req.user, query);
    res
      .status(200)
      .json(successResponse("Complaints retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const searchComplaintsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const query = listQuerySchema.parse(req.query);

    const result = await searchComplaints(req.user, query);
    res
      .status(200)
      .json(successResponse("Search results retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const listMyAssignedHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const query = listQuerySchema.parse(req.query);

    const result = await listComplaints(
      { userId: req.user.userId, role: Role.TECHNICIAN },
      query,
    );
    res
      .status(200)
      .json(
        successResponse("Assigned complaints retrieved successfully", result),
      );
  } catch (error) {
    next(error);
  }
};

export const getComplaintByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);

    const result = await getComplaintById(req.user, id);
    res
      .status(200)
      .json(successResponse("Complaint retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const updateComplaintHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);

    let validatedData: UpdateComplaintInput | ReTriageInput;
    if (req.user.role === Role.CITIZEN) {
      validatedData = updateComplaintSchema.parse(req.body);
    } else if (req.user.role === Role.MANAGER || req.user.role === Role.ADMIN) {
      validatedData = reTriageSchema.parse(req.body);
    } else {
      throw new AppError("Forbidden: Insufficient permissions", 403);
    }

    const result = await updateComplaint(req.user, id, validatedData);
    res
      .status(200)
      .json(successResponse("Complaint updated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const assignTechnicianHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);
    const { technicianId } = req.body;

    const result = await assignTechnician(req.user, id, technicianId);
    res
      .status(200)
      .json(successResponse("Technician assigned successfully", result));
  } catch (error) {
    next(error);
  }
};

export const updateStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);

    const result = await updateStatus(req.user, id, req.body);
    res
      .status(200)
      .json(successResponse("Complaint status updated successfully", result));
  } catch (error) {
    next(error);
  }
};

export const cancelComplaintHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);

    const result = await cancelComplaint(req.user, id);
    res
      .status(200)
      .json(successResponse("Complaint cancelled successfully", result));
  } catch (error) {
    next(error);
  }
};

export const softDeleteComplaintHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);

    const result = await softDeleteComplaint(req.user, id);
    res
      .status(200)
      .json(successResponse("Complaint deleted successfully", result));
  } catch (error) {
    next(error);
  }
};

export const reopenComplaintHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = getParamId(req);
    const result = await reopenComplaint(req.user, id, req.body);
    res
      .status(200)
      .json(successResponse("Complaint reopened successfully", result));
  } catch (error) {
    next(error);
  }
};
