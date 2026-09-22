import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  addAttachments,
  deleteAttachment,
  listAttachments,
} from "./attachment.service";

export const addAttachmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const complaintId = req.params.complaintId;
    if (typeof complaintId !== "string") {
      throw new AppError("Invalid complaint ID", 400);
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const { type } = req.body;

    const result = await addAttachments(
      req.user,
      complaintId,
      type,
      files ?? [],
    );
    res
      .status(201)
      .json(successResponse("Attachments uploaded successfully", result));
  } catch (error) {
    next(error);
  }
};

export const listAttachmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const complaintId = req.params.complaintId;
    if (typeof complaintId !== "string") {
      throw new AppError("Invalid complaint ID", 400);
    }

    const result = await listAttachments(req.user, complaintId);
    res
      .status(200)
      .json(successResponse("Attachments retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

export const deleteAttachmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { id } = req.params;
    if (typeof id !== "string")
      throw new AppError("Invalid attachment ID", 400);

    const result = await deleteAttachment(req.user, id);
    res.status(200).json(successResponse(result.message));
  } catch (error) {
    next(error);
  }
};
