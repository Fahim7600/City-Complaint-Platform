import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";
import type { UserContext } from "./complaint.service";

export interface ComplaintAccessTarget {
  id: string;
  citizenId: string;
  assignedTechnicianId: string | null;
  departmentId: string;
  deletedAt?: Date | null;
}

export const getManagerDepartmentId = async (
  userId: string,
): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true, deletedAt: true },
  });

  if (!user || user.deletedAt || !user.departmentId) {
    throw new AppError("Manager is not assigned to a department", 400);
  }

  return user.departmentId;
};

export const canViewComplaint = async (
  user: UserContext,
  complaint: ComplaintAccessTarget,
): Promise<boolean> => {
  if (user.role === Role.ADMIN) {
    return true;
  }
  if (user.role === Role.CITIZEN) {
    return complaint.citizenId === user.userId;
  }
  if (user.role === Role.TECHNICIAN) {
    return complaint.assignedTechnicianId === user.userId;
  }
  if (user.role === Role.MANAGER) {
    const departmentId = await getManagerDepartmentId(user.userId);
    return complaint.departmentId === departmentId;
  }
  return false;
};

export const verifyComplaintAccess = async (
  user: UserContext,
  complaint: ComplaintAccessTarget,
): Promise<void> => {
  const allowed = await canViewComplaint(user, complaint);
  if (!allowed) {
    if (user.role === Role.CITIZEN) {
      throw new AppError(
        "Forbidden: You can only view your own complaints",
        403,
      );
    }
    if (user.role === Role.TECHNICIAN) {
      throw new AppError(
        "Forbidden: You are not assigned to this complaint",
        403,
      );
    }
    if (user.role === Role.MANAGER) {
      throw new AppError(
        "Forbidden: Complaint belongs to a different department",
        403,
      );
    }
    throw new AppError("Forbidden: Insufficient permissions", 403);
  }
};
