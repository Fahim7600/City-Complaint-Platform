import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.validation";

const ensureDepartment = async (departmentId: string) => {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department || department.deletedAt) {
    throw new AppError("Department not found", 404);
  }
};

export const listCategoriesForDepartment = async (departmentId: string) => {
  await ensureDepartment(departmentId);
  return prisma.category.findMany({
    where: { departmentId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      slaHours: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
};

export const createCategory = async (
  departmentId: string,
  data: CreateCategoryInput,
  actorId: string,
) => {
  await ensureDepartment(departmentId);
  const existing = await prisma.category.findFirst({
    where: { name: data.name, departmentId, deletedAt: null },
  });
  if (existing) {
    throw new AppError("Category name already exists in this department", 400);
  }

  const category = await prisma.category.create({
    data: { ...data, departmentId, slaHours: data.slaHours ?? 72 },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CATEGORY_CREATED",
      entityType: "Category",
      entityId: category.id,
    },
  });
  return category;
};

export const updateCategory = async (
  id: string,
  data: UpdateCategoryInput,
  actorId: string,
) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.deletedAt) {
    throw new AppError("Category not found", 404);
  }
  if (data.name !== undefined && data.name !== category.name) {
    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        departmentId: category.departmentId,
        deletedAt: null,
        id: { not: id },
      },
    });
    if (existing) {
      throw new AppError(
        "Category name already exists in this department",
        400,
      );
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data,
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CATEGORY_UPDATED",
      entityType: "Category",
      entityId: id,
    },
  });
  return updatedCategory;
};

export const deleteCategory = async (id: string, actorId: string) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.deletedAt) {
    throw new AppError("Category not found", 404);
  }

  const activeComplaintCount = await prisma.complaint.count({
    where: {
      categoryId: id,
      deletedAt: null,
      status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED", "REJECTED"] },
    },
  });
  if (activeComplaintCount > 0) {
    throw new AppError(
      `Cannot delete a category with ${activeComplaintCount} active complaint(s) still open — resolve or close them first`,
      400,
    );
  }

  const deletedCategory = await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CATEGORY_DELETED",
      entityType: "Category",
      entityId: id,
    },
  });
  return deletedCategory;
};
