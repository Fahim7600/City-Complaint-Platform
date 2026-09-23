import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "./department.validation";

export const listPublicDepartments = async () =>
  prisma.department.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

export const listAllDepartments = async (includeDeleted: boolean) =>
  prisma.department.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

export const getDepartmentById = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      categories: {
        where: { deletedAt: null },
        select: { id: true, name: true, slaHours: true },
      },
    },
  });
  if (!department || department.deletedAt) {
    throw new AppError("Department not found", 404);
  }
  return department;
};

export const createDepartment = async (
  data: CreateDepartmentInput,
  actorId: string,
) => {
  const existing = await prisma.department.findFirst({
    where: { name: data.name, deletedAt: null },
  });
  if (existing) throw new AppError("Department name already exists", 400);

  const department = await prisma.department.create({ data });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DEPARTMENT_CREATED",
      entityType: "Department",
      entityId: department.id,
    },
  });
  return department;
};

export const updateDepartment = async (
  id: string,
  data: UpdateDepartmentInput,
  actorId: string,
) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department || department.deletedAt) {
    throw new AppError("Department not found", 404);
  }
  if (data.name !== undefined && data.name !== department.name) {
    const existing = await prisma.department.findFirst({
      where: { name: data.name, deletedAt: null, id: { not: id } },
    });
    if (existing) throw new AppError("Department name already exists", 400);
  }

  const updatedDepartment = await prisma.department.update({
    where: { id },
    data,
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DEPARTMENT_UPDATED",
      entityType: "Department",
      entityId: id,
    },
  });
  return updatedDepartment;
};

export const deleteDepartment = async (id: string, actorId: string) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department || department.deletedAt) {
    throw new AppError("Department not found", 404);
  }

  const activeComplaintCount = await prisma.complaint.count({
    where: {
      departmentId: id,
      deletedAt: null,
      status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED", "REJECTED"] },
    },
  });
  if (activeComplaintCount > 0) {
    throw new AppError(
      `Cannot delete a department with ${activeComplaintCount} active complaint(s) still open — resolve or close them first`,
      400,
    );
  }

  const deletedDepartment = await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DEPARTMENT_DELETED",
      entityType: "Department",
      entityId: id,
    },
  });
  return deletedDepartment;
};
