import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";
import { canViewComplaint } from "../complaints/complaint.access";

interface ReviewUser {
  userId: string;
  role: string;
}

export const createReview = async (
  user: ReviewUser,
  complaintId: string,
  data: { rating: number; comment?: string },
) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
  });

  if (!complaint) {
    throw new AppError("Complaint not found", 404);
  }
  if (user.role !== "CITIZEN" || complaint.citizenId !== user.userId) {
    throw new AppError("You can only review your own complaints", 403);
  }
  if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
    throw new AppError(
      "Complaint must be resolved or closed before leaving a review",
      400,
    );
  }
  if (!complaint.assignedTechnicianId) {
    throw new AppError(
      "This complaint has no assigned technician to review",
      400,
    );
  }

  const existingReview = await prisma.review.findUnique({
    where: { complaintId },
  });
  if (existingReview) {
    throw new AppError("You have already reviewed this complaint", 400);
  }

  const review = await prisma.review.create({
    data: {
      complaintId,
      citizenId: user.userId,
      technicianId: complaint.assignedTechnicianId,
      rating: data.rating,
      comment: data.comment ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "REVIEW_SUBMITTED",
      entityType: "Review",
      entityId: review.id,
      metadata: { complaintId, rating: data.rating },
    },
  });

  return review;
};

export const getReview = async (user: ReviewUser, complaintId: string) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
  });

  if (!complaint) {
    throw new AppError("Complaint not found", 404);
  }

  const canView = await canViewComplaint(
    { userId: user.userId, role: user.role as Role },
    complaint,
  );
  if (!canView) {
    throw new AppError("Forbidden", 403);
  }

  const review = await prisma.review.findUnique({
    where: { complaintId },
  });
  if (!review) {
    throw new AppError("No review submitted for this complaint yet", 404);
  }

  return review;
};

export const getTechnicianRating = async (technicianId: string) => {
  const technician = await prisma.user.findUnique({
    where: { id: technicianId },
    select: { role: true },
  });
  if (!technician || technician.role !== Role.TECHNICIAN) {
    throw new AppError("Technician not found", 404);
  }

  const result = await prisma.review.aggregate({
    where: { technicianId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    technicianId,
    averageRating:
      result._avg.rating === null
        ? null
        : Math.round(result._avg.rating * 10) / 10,
    totalReviews: result._count.rating,
  };
};
