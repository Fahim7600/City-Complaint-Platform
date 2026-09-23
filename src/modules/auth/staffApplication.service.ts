import { ApprovalStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { sanitizeUser } from "../../utils/sanitizeUser";
import { AppError } from "./auth.service";

export const submitStaffApplication = async (
  userId: string,
  data: {
    requestedRole: string;
    departmentId: string;
    experience?: string;
    qualification?: string;
  },
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (user.approvalStatus === ApprovalStatus.PENDING) {
    throw new AppError("You already have a pending staff application", 400);
  }
  if (user.role !== Role.CITIZEN) {
    throw new AppError("Only citizen accounts can apply for a staff role", 400);
  }

  const department = await prisma.department.findFirst({
    where: { id: data.departmentId, deletedAt: null },
  });
  if (!department) throw new AppError("Department not found", 404);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      requestedRole: data.requestedRole as Role,
      approvalStatus: ApprovalStatus.PENDING,
      departmentId: data.departmentId,
      experience: data.experience ?? null,
      qualification: data.qualification ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "STAFF_APPLICATION_SUBMITTED",
      entityType: "User",
      entityId: userId,
      metadata: {
        requestedRole: data.requestedRole,
        departmentId: data.departmentId,
      },
    },
  });

  return sanitizeUser(updatedUser);
};
