import type { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { successResponse } from "../../utils/response";

export const listDepartmentsController = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res
    .status(200)
    .json(successResponse("Departments retrieved successfully", departments));
};
