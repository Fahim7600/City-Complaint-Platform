import { ApprovalStatus, ComplaintStatus, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import { generateTempPassword } from "../../utils/password";
import { sanitizeUser } from "../../utils/sanitizeUser";
import { AppError, BCRYPT_SALT_ROUNDS } from "../auth/auth.service";
import { sendEmail } from "../mail/mail.service";
import { staffInvite } from "../mail/mail.templates";
import { createNotification } from "../notifications/notification.service";

export interface InviterUser {
  userId: string;
  role: Role;
}

export interface InviteStaffParams {
  inviter: InviterUser;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  departmentId?: string;
}

export interface ResendInviteParams {
  inviter: InviterUser;
  userId: string;
}

export interface RemoveTechnicianParams {
  inviter: InviterUser;
  technicianId: string;
}

/**
 * Invites a new staff member (Technician or Manager).
 * Creates the user with a temporary password and sends an invitation email.
 */
export const inviteStaff = async (params: InviteStaffParams) => {
  const { inviter, name, email, phone, role } = params;

  let targetRole = role;
  let targetDepartmentId = params.departmentId;

  // 1. Validate inviter permissions and target role / department
  if (inviter.role === Role.MANAGER) {
    // Managers can only invite TECHNICIANS into their own department
    targetRole = Role.TECHNICIAN;
    const manager = await prisma.user.findUnique({
      where: { id: inviter.userId },
      select: { departmentId: true },
    });
    if (!manager?.departmentId) {
      throw new AppError("Manager does not belong to any department", 400);
    }
    targetDepartmentId = manager.departmentId;
  } else if (inviter.role === Role.ADMIN) {
    if (targetRole === Role.ADMIN) {
      throw new AppError("Cannot invite administrator accounts", 400);
    }
    if (targetRole !== Role.TECHNICIAN && targetRole !== Role.MANAGER) {
      throw new AppError(
        "Only TECHNICIAN and MANAGER roles can be invited",
        400,
      );
    }
    if (!targetDepartmentId) {
      throw new AppError("Department ID is required", 400);
    }
  } else {
    throw new AppError("Forbidden: Insufficient permissions", 403);
  }

  // 2. Check if email already exists (including deactivated / soft-deleted users)
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    throw new AppError(
      "A user with this email already exists. Use staff applications or role change instead.",
      409,
    );
  }

  // 3. Validate department exists and is active
  const department = await prisma.department.findFirst({
    where: { id: targetDepartmentId, deletedAt: null },
  });
  if (!department) {
    throw new AppError("Department not found", 404);
  }

  // 4. Generate temporary password and expiration (now + 7 days)
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);
  const tempPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 5. In a Prisma transaction, create user and audit log
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        role: targetRole,
        departmentId: targetDepartmentId,
        passwordHash,
        mustChangePassword: true,
        tempPasswordExpiresAt,
        invitedById: inviter.userId,
        approvalStatus: ApprovalStatus.APPROVED,
        isAvailable: targetRole === Role.TECHNICIAN,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: inviter.userId,
        action: "STAFF_INVITED",
        entityType: "User",
        entityId: newUser.id,
        metadata: {
          role: targetRole,
          departmentId: targetDepartmentId,
          invitedBy: inviter.userId,
        },
      },
    });

    return newUser;
  });

  // 6. Send invitation email through Brevo
  const loginUrl = `${config.FRONTEND_BASE_URL || config.APP_BASE_URL}/login`;
  try {
    const emailContent = staffInvite({
      name: user.name,
      role: user.role,
      departmentName: department.name,
      email: user.email,
      tempPassword,
      loginUrl,
    });

    await sendEmail({
      to: { email: user.email, name: user.name },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (emailErr) {
    console.error(
      "[Staff Invite] Email sending failed, rolling back created user:",
      emailErr,
    );

    // Hard-delete the unused account on failure
    await prisma.user.delete({ where: { id: user.id } }).catch((delErr) => {
      console.error("[Staff Invite] Rollback user delete failed:", delErr);
    });

    await prisma.auditLog
      .create({
        data: {
          actorId: inviter.userId,
          action: "STAFF_INVITE_FAILED",
          entityType: "User",
          entityId: user.id,
          metadata: {
            email: user.email,
            role: targetRole,
            departmentId: targetDepartmentId,
            error:
              emailErr instanceof Error
                ? emailErr.message
                : "Email sending failed",
          },
        },
      })
      .catch(() => {});

    throw new AppError(
      "Could not send the invitation email. The staff account was not created.",
      502,
    );
  }

  return sanitizeUser(user);
};

/**
 * Resends a staff invitation with a newly generated temporary password.
 * Only available for users who still have mustChangePassword=true.
 */
export const resendInvite = async (params: ResendInviteParams) => {
  const { inviter, userId } = params;

  // 1. Fetch target user
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { department: true },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // 2. Only allowed if mustChangePassword=true
  if (!user.mustChangePassword) {
    throw new AppError("The user has already set their password", 409);
  }

  // 3. Permission checks
  if (inviter.role === Role.MANAGER) {
    const manager = await prisma.user.findUnique({
      where: { id: inviter.userId },
      select: { departmentId: true },
    });
    if (
      !manager?.departmentId ||
      user.departmentId !== manager.departmentId ||
      user.role !== Role.TECHNICIAN
    ) {
      throw new AppError("Forbidden: Insufficient permissions", 403);
    }
  } else if (inviter.role !== Role.ADMIN) {
    throw new AppError("Forbidden: Insufficient permissions", 403);
  }

  // 4. Generate new temporary password and expiration
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);
  const tempPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      tempPasswordExpiresAt,
      mustChangePassword: true,
    },
  });

  // 5. Send invitation email
  const departmentName = user.department?.name || "the department";
  const loginUrl = `${config.FRONTEND_BASE_URL || config.APP_BASE_URL}/login`;
  const emailContent = staffInvite({
    name: user.name,
    role: user.role,
    departmentName,
    email: user.email,
    tempPassword,
    loginUrl,
  });

  await sendEmail({
    to: { email: user.email, name: user.name },
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  // 6. Audit log
  await prisma.auditLog.create({
    data: {
      actorId: inviter.userId,
      action: "STAFF_INVITE_RESENT",
      entityType: "User",
      entityId: user.id,
      metadata: {
        role: user.role,
        departmentId: user.departmentId,
      },
    },
  });

  return sanitizeUser(updatedUser);
};

/**
 * Removes a technician from a manager's department.
 * Blocked if the technician has complaints in ASSIGNED or IN_PROGRESS.
 */
export const removeTechnician = async (params: RemoveTechnicianParams) => {
  const { inviter, technicianId } = params;

  // 1. Get manager's department
  const manager = await prisma.user.findUnique({
    where: { id: inviter.userId },
    select: { departmentId: true },
  });
  if (!manager?.departmentId) {
    throw new AppError("Manager does not belong to any department", 400);
  }

  // 2. Validate technician in manager's department
  const technician = await prisma.user.findFirst({
    where: {
      id: technicianId,
      departmentId: manager.departmentId,
      role: Role.TECHNICIAN,
      deletedAt: null,
    },
  });
  if (!technician) {
    throw new AppError("Technician not found in your department", 404);
  }

  // 3. Check for active assigned or in-progress complaints
  const blockingComplaints = await prisma.complaint.findMany({
    where: {
      assignedTechnicianId: technicianId,
      status: { in: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS] },
      deletedAt: null,
    },
    select: { id: true },
  });

  if (blockingComplaints.length > 0) {
    return {
      blocked: true as const,
      blockingComplaintIds: blockingComplaints.map((c) => c.id),
    };
  }

  // 4. Update technician to CITIZEN, clear department, set unavailable
  await prisma.user.update({
    where: { id: technicianId },
    data: {
      role: Role.CITIZEN,
      departmentId: null,
      isAvailable: false,
      mustChangePassword: false,
      tempPasswordExpiresAt: null,
    },
  });

  // 5. Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId: technicianId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // 6. Write audit log
  await prisma.auditLog.create({
    data: {
      actorId: inviter.userId,
      action: "STAFF_REMOVED",
      entityType: "User",
      entityId: technicianId,
      metadata: {
        departmentId: manager.departmentId,
        previousRole: Role.TECHNICIAN,
      },
    },
  });

  // 7. Send in-app notification
  await createNotification({
    userId: technicianId,
    type: "STAFF_REMOVED",
    message: "You have been removed as a technician from the department.",
    relatedEntityType: "DEPARTMENT",
    relatedEntityId: manager.departmentId,
  });

  return {
    blocked: false as const,
    technicianId,
  };
};

/**
 * Lists technicians for the authenticated manager's department.
 * Includes invitePending flag (mapped from mustChangePassword).
 */
export const listMyDepartmentTechnicians = async (managerUserId: string) => {
  const manager = await prisma.user.findUnique({
    where: { id: managerUserId },
    select: { departmentId: true },
  });
  if (!manager?.departmentId) {
    throw new AppError("Manager does not belong to any department", 400);
  }

  const technicians = await prisma.user.findMany({
    where: {
      departmentId: manager.departmentId,
      role: Role.TECHNICIAN,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      isAvailable: true,
      mustChangePassword: true,
      createdAt: true,
      reviewsReceived: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return technicians.map((tech) => {
    const reviewCount = tech.reviewsReceived.length;
    const sumRatings = tech.reviewsReceived.reduce(
      (acc, r) => acc + r.rating,
      0,
    );
    const averageRating =
      reviewCount > 0 ? Number((sumRatings / reviewCount).toFixed(2)) : 0;

    return {
      id: tech.id,
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      avatarUrl: tech.avatarUrl,
      isAvailable: tech.isAvailable,
      invitePending: tech.mustChangePassword,
      mustChangePassword: tech.mustChangePassword,
      averageRating,
      reviewCount,
      createdAt: tech.createdAt,
    };
  });
};
