import { ComplaintStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { sanitizeUser } from "../../utils/sanitizeUser";
import { AppError } from "../auth/auth.service";
import type { UpdateAvailabilityInput } from "./technician.validation";

export const updateAvailability = async (
  technicianId: string,
  input: UpdateAvailabilityInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: technicianId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("Technician not found", 404);
  }

  if (user.role !== Role.TECHNICIAN) {
    throw new AppError(
      "Forbidden: Only technicians can update availability",
      403,
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: technicianId },
    data: { isAvailable: input.isAvailable },
  });

  await prisma.auditLog.create({
    data: {
      actorId: technicianId,
      action: "TECHNICIAN_AVAILABILITY_UPDATED",
      entityType: "User",
      entityId: technicianId,
      metadata: { isAvailable: input.isAvailable },
    },
  });

  return sanitizeUser(updatedUser);
};

export const getTechnicianPerformance = async (technicianId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: technicianId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("Technician not found", 404);
  }

  if (user.role !== Role.TECHNICIAN) {
    throw new AppError("Forbidden: Only technicians can view performance", 403);
  }

  const now = new Date();

  const [
    totalAssigned,
    totalResolved,
    inProgress,
    overdueCount,
    reviewAggregate,
    resolvedComplaints,
    reopenAggregate,
  ] = await Promise.all([
    prisma.complaint.count({
      where: {
        assignedTechnicianId: technicianId,
        deletedAt: null,
      },
    }),
    prisma.complaint.count({
      where: {
        assignedTechnicianId: technicianId,
        deletedAt: null,
        status: { in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
      },
    }),
    prisma.complaint.count({
      where: {
        assignedTechnicianId: technicianId,
        deletedAt: null,
        status: ComplaintStatus.IN_PROGRESS,
      },
    }),
    prisma.complaint.count({
      where: {
        assignedTechnicianId: technicianId,
        deletedAt: null,
        status: { in: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS] },
        slaDueAt: { lt: now },
      },
    }),
    prisma.review.aggregate({
      where: { technicianId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.complaint.findMany({
      where: {
        assignedTechnicianId: technicianId,
        deletedAt: null,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.complaint.aggregate({
      where: {
        assignedTechnicianId: technicianId,
        deletedAt: null,
      },
      _sum: { reopenCount: true },
    }),
  ]);

  let averageResolutionHours = 0;
  if (resolvedComplaints.length > 0) {
    const totalHours = resolvedComplaints.reduce((acc, c) => {
      const diffMs = (c.resolvedAt?.getTime() ?? 0) - c.createdAt.getTime();
      return acc + Math.max(0, diffMs / (1000 * 60 * 60));
    }, 0);
    averageResolutionHours = Number(
      (totalHours / resolvedComplaints.length).toFixed(2),
    );
  }

  const averageRating =
    reviewAggregate._avg.rating !== null
      ? Number(reviewAggregate._avg.rating.toFixed(2))
      : 0;

  const reviewCount = reviewAggregate._count.rating || 0;
  const reopenCount = reopenAggregate._sum.reopenCount || 0;

  return {
    totalAssigned,
    totalResolved,
    inProgress,
    overdueCount,
    averageRating,
    reviewCount,
    averageResolutionHours,
    reopenCount,
  };
};
