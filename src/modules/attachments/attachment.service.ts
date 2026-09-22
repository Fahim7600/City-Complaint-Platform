import { AttachmentType, ComplaintStatus, Role } from "@prisma/client";
import {
  deleteFromCloudinary,
  uploadBufferToCloudinary,
} from "../../config/cloudinary";
import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";
import { verifyComplaintAccess } from "../complaints/complaint.access";
import type { UserContext } from "../complaints/complaint.service";

export const addAttachments = async (
  user: UserContext,
  complaintId: string,
  type: AttachmentType,
  files: Express.Multer.File[],
) => {
  if (!files || files.length === 0) {
    throw new AppError("No files provided", 400);
  }

  const uploader = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { isPremium: true },
  });
  if (!uploader?.isPremium && files.length > 5) {
    throw new AppError(
      "Free tier is limited to 5 files per upload — upgrade to premium for up to 10",
      400,
    );
  }

  // Fetch complaint
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  // Role-based authorization and business rules
  let effectiveType = type;

  if (user.role === Role.CITIZEN) {
    if (complaint.citizenId !== user.userId) {
      throw new AppError(
        "Forbidden: You can only add attachments to your own complaints",
        403,
      );
    }

    const blockedStatuses: ComplaintStatus[] = [
      ComplaintStatus.CLOSED,
      ComplaintStatus.CANCELLED,
      ComplaintStatus.REJECTED,
    ];
    if (blockedStatuses.includes(complaint.status)) {
      throw new AppError(
        "Cannot add attachments to a closed, cancelled, or rejected complaint",
        400,
      );
    }

    // Citizens can only upload EVIDENCE — override whatever was sent
    effectiveType = AttachmentType.EVIDENCE;
  } else if (user.role === Role.TECHNICIAN) {
    if (complaint.assignedTechnicianId !== user.userId) {
      throw new AppError(
        "Forbidden: You are not the assigned technician for this complaint",
        403,
      );
    }

    const allowedStatuses: ComplaintStatus[] = [
      ComplaintStatus.ASSIGNED,
      ComplaintStatus.IN_PROGRESS,
    ];
    if (!allowedStatuses.includes(complaint.status)) {
      throw new AppError(
        "Attachments can only be added when the complaint is ASSIGNED or IN_PROGRESS",
        400,
      );
    }

    if (type === AttachmentType.EVIDENCE) {
      throw new AppError(
        "Technicians can only upload BEFORE_WORK or AFTER_WORK attachments",
        400,
      );
    }
  } else {
    throw new AppError(
      "Forbidden: Only citizens and technicians can add attachments",
      403,
    );
  }

  const folder = `complaints/${complaintId}`;

  // Upload all files to Cloudinary in parallel
  const uploadResults = await Promise.allSettled(
    files.map((file) => uploadBufferToCloudinary(file.buffer, folder)),
  );

  const succeeded: { url: string; publicId: string }[] = [];
  const failed: string[] = [];

  uploadResults.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else {
      failed.push(
        `File "${files[idx].originalname}": ${result.reason?.message ?? "Unknown error"}`,
      );
    }
  });

  // If any uploads failed, clean up successful ones then throw
  if (failed.length > 0) {
    await Promise.allSettled(
      succeeded.map((s) => deleteFromCloudinary(s.publicId)),
    );
    throw new AppError(
      `Some files failed to upload — all uploads cancelled: ${failed.join("; ")}`,
      500,
    );
  }

  // Persist all attachment rows atomically
  const attachments = await prisma.$transaction(
    succeeded.map((s) =>
      prisma.attachment.create({
        data: {
          complaintId,
          url: s.url,
          publicId: s.publicId,
          type: effectiveType,
          uploadedById: user.userId,
        },
      }),
    ),
  );

  // Single audit log entry for the batch
  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "ATTACHMENTS_ADDED",
      entityType: "Complaint",
      entityId: complaintId,
      metadata: { count: attachments.length, type: effectiveType },
    },
  });

  return attachments;
};

export const listAttachments = async (
  user: UserContext,
  complaintId: string,
) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  // Reuse shared complaint access check
  await verifyComplaintAccess(user, complaint);

  const attachments = await prisma.attachment.findMany({
    where: { complaintId },
    orderBy: { createdAt: "desc" },
  });

  return attachments;
};

export const deleteAttachment = async (
  user: UserContext,
  attachmentId: string,
) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      complaint: { select: { id: true, deletedAt: true } },
    },
  });

  if (!attachment) {
    throw new AppError("Attachment not found", 404);
  }

  // Only the original uploader or ADMIN can delete
  if (attachment.uploadedById !== user.userId && user.role !== Role.ADMIN) {
    throw new AppError(
      "Forbidden: You can only delete your own attachments",
      403,
    );
  }

  // Delete from Cloudinary FIRST — if this fails, do NOT delete the DB row
  await deleteFromCloudinary(attachment.publicId);

  // Delete DB row
  await prisma.attachment.delete({ where: { id: attachmentId } });

  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "ATTACHMENT_DELETED",
      entityType: "Attachment",
      entityId: attachmentId,
      metadata: { complaintId: attachment.complaintId },
    },
  });

  return { message: "Attachment deleted successfully" };
};
