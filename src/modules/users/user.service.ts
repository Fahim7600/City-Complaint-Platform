import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { sanitizeUser } from "../../utils/sanitizeUser";
import { AppError, BCRYPT_SALT_ROUNDS } from "../auth/auth.service";
import type {
  ChangePasswordInput,
  UpdateProfileInput,
} from "./user.validation";

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("User not found", 404);
  }

  return sanitizeUser(user);
};

export const updateProfile = async (
  userId: string,
  data: UpdateProfileInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("User not found", 404);
  }

  // Filter out undefined fields
  const updateData: Record<string, string> = {};
  const updatedFieldNames: string[] = [];

  if (data.name !== undefined) {
    updateData.name = data.name;
    updatedFieldNames.push("name");
  }
  if (data.phone !== undefined) {
    updateData.phone = data.phone;
    updatedFieldNames.push("phone");
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl;
    updatedFieldNames.push("avatarUrl");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  // Audit Log: Record field names changed without logging values
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: userId,
      metadata: { updatedFields: updatedFieldNames },
    },
  });

  return sanitizeUser(updatedUser);
};

export const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
) => {
  const { currentPassword, newPassword } = input;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("User not found", 404);
  }

  // If user has an existing passwordHash, verify currentPassword
  if (user.passwordHash !== null) {
    if (!currentPassword) {
      throw new AppError("Current password is required", 400);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }
  }

  // Hash new password using shared BCRYPT_SALT_ROUNDS constant
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  // Update passwordHash
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // Revoke ALL active refresh token sessions for this user
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: userId,
    },
  });

  return {
    message:
      "Password changed successfully. All active sessions have been revoked for security.",
  };
};
