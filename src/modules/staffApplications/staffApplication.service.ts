import { ApprovalStatus, type Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { sanitizeUser } from "../../utils/sanitizeUser";
import { AppError } from "../auth/auth.service";
import { createNotification } from "../notifications/notification.service";

interface StaffApplicationUser {
  userId: string;
  role: string;
  departmentId?: string | null;
}

const getManagerDepartmentId = async (user: StaffApplicationUser) => {
  if (user.departmentId !== undefined) return user.departmentId;
  const manager = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { departmentId: true },
  });
  return manager?.departmentId ?? null;
};

export const listPendingApplications = async (
  user: StaffApplicationUser,
  query: { page?: number; limit?: number },
) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const where: Prisma.UserWhereInput = {
    approvalStatus: ApprovalStatus.PENDING,
    deletedAt: null,
  };

  if (user.role === "MANAGER") {
    where.departmentId = await getManagerDepartmentId(user);
    where.requestedRole = Role.TECHNICIAN;
  }

  const total = await prisma.user.count({ where });
  const items = await prisma.user.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      requestedRole: true,
      departmentId: true,
      experience: true,
      qualification: true,
      createdAt: true,
    },
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const decideApplication = async (
  user: StaffApplicationUser,
  targetUserId: string,
  decision: "APPROVED" | "REJECTED",
  reason?: string,
) => {
  const target = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  });
  if (!target) throw new AppError("User not found", 404);
  if (
    target.approvalStatus !== ApprovalStatus.PENDING ||
    target.requestedRole === null
  ) {
    throw new AppError("No pending application for this user", 400);
  }

  if (target.requestedRole === Role.MANAGER) {
    if (user.role !== "ADMIN") {
      throw new AppError("Forbidden", 403);
    }
  } else if (target.requestedRole === Role.TECHNICIAN) {
    if (user.role === "MANAGER") {
      const managerDepartmentId = await getManagerDepartmentId(user);
      if (!managerDepartmentId || managerDepartmentId !== target.departmentId) {
        throw new AppError("Forbidden", 403);
      }
    } else if (user.role !== "ADMIN") {
      throw new AppError("Forbidden", 403);
    }
  } else {
    throw new AppError("Forbidden", 403);
  }

  if (decision === "REJECTED" && !reason?.trim()) {
    throw new AppError(
      "A reason is required when rejecting an application",
      400,
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data:
      decision === "APPROVED"
        ? {
            role: target.requestedRole,
            approvalStatus: ApprovalStatus.APPROVED,
            decidedById: user.userId,
            decidedAt: new Date(),
          }
        : {
            approvalStatus: ApprovalStatus.REJECTED,
            decidedById: user.userId,
            decidedAt: new Date(),
          },
  });

  await createNotification({
    userId: targetUserId,
    type: "STAFF_APPLICATION_DECISION",
    message:
      decision === "APPROVED"
        ? `Your application for ${target.requestedRole} was approved`
        : `Your staff application was rejected: ${reason}`,
    relatedEntityType: "User",
    relatedEntityId: targetUserId,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action:
        decision === "APPROVED"
          ? "STAFF_APPLICATION_APPROVED"
          : "STAFF_APPLICATION_REJECTED",
      entityType: "User",
      entityId: targetUserId,
      metadata:
        decision === "REJECTED" ? { reason } : { role: target.requestedRole },
    },
  });

  return sanitizeUser(updatedUser);
};
