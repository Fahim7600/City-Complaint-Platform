import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import { sendEmail } from "../mail/mail.service";
import {
  googleAccountNotice,
  passwordChanged,
  passwordResetCode,
} from "../mail/mail.templates";
import { AppError, BCRYPT_SALT_ROUNDS } from "./auth.service";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyResetCodeInput,
} from "./auth.validation";

export const requestPasswordReset = async (
  input: ForgotPasswordInput,
): Promise<{ cooldownSeconds: number }> => {
  const genericResponse = { cooldownSeconds: 60 };

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Always return identical success payload to avoid leaking account existence
  if (!user || user.deletedAt) {
    return genericResponse;
  }

  // If user signed up via Google and has no password, notify them to use Google sign-in
  if (!user.passwordHash && !user.mustChangePassword) {
    try {
      const emailContent = googleAccountNotice({
        name: user.name,
        loginUrl: `${config.FRONTEND_BASE_URL}/login`,
      });
      await sendEmail({
        to: { email: user.email, name: user.name },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (err) {
      console.error("[Auth] Failed to send Google account notice email:", err);
    }

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "User",
        entityId: user.id,
        metadata: { method: "google_account_notice" },
      },
    });

    return genericResponse;
  }

  // Cooldown: check if a code was created for this user in the last 60 seconds
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
  const recentCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      createdAt: { gte: sixtySecondsAgo },
    },
  });
  if (recentCode) {
    return genericResponse;
  }

  // Cap at 5 codes per user per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await prisma.passwordResetCode.count({
    where: {
      userId: user.id,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (hourlyCount >= 5) {
    return genericResponse;
  }

  // Generate 6-digit code zero-padded
  const rawCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = crypto
    .createHash("sha256")
    .update(rawCode + config.JWT_ACCESS_SECRET)
    .digest("hex");

  // Invalidate (delete) previous unused codes
  await prisma.passwordResetCode.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  // Store new code hash expiring in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
    },
  });

  // Log code in development for easy testing without Brevo API key
  if (config.NODE_ENV !== "production") {
    console.log(`[Auth Dev] Password reset code for ${user.email}: ${rawCode}`);
  }

  // Send email via Brevo HTTPS API
  try {
    const emailContent = passwordResetCode({
      name: user.name,
      code: rawCode,
      expiresInMinutes: 10,
    });
    await sendEmail({
      to: { email: user.email, name: user.name },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (err) {
    console.error("[Auth] Failed to send password reset code email:", err);
  }

  return genericResponse;
};

export const verifyResetCode = async (
  input: VerifyResetCodeInput,
): Promise<{ resetToken: string; expiresInSeconds: number }> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || user.deletedAt) {
    throw new AppError("Invalid or expired code", 400);
  }

  // Find latest unused, unverified, unexpired code for this user
  const resetCodeRecord = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!resetCodeRecord) {
    throw new AppError("Invalid or expired code", 400);
  }

  // Hash candidate code with pepper
  const candidateHash = crypto
    .createHash("sha256")
    .update(input.code + config.JWT_ACCESS_SECRET)
    .digest("hex");

  const bufA = Buffer.from(candidateHash, "utf8");
  const bufB = Buffer.from(resetCodeRecord.codeHash, "utf8");

  const isMatch =
    bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

  if (!isMatch) {
    const updatedAttempts = resetCodeRecord.attempts + 1;
    if (updatedAttempts >= 5) {
      await prisma.passwordResetCode.update({
        where: { id: resetCodeRecord.id },
        data: {
          attempts: updatedAttempts,
          usedAt: new Date(),
        },
      });
      throw new AppError("Too many attempts. Request a new code.", 400);
    }

    await prisma.passwordResetCode.update({
      where: { id: resetCodeRecord.id },
      data: {
        attempts: updatedAttempts,
      },
    });

    throw new AppError("Invalid or expired code", 400);
  }

  // Correct code: generate 32-byte hex resetToken
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetCode.update({
    where: { id: resetCodeRecord.id },
    data: {
      resetTokenHash,
      verifiedAt: new Date(),
      resetTokenExpiresAt,
    },
  });

  return {
    resetToken,
    expiresInSeconds: 900,
  };
};

export const resetPassword = async (
  input: ResetPasswordInput,
): Promise<void> => {
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(input.resetToken)
    .digest("hex");

  const resetCodeRecord = await prisma.passwordResetCode.findFirst({
    where: {
      resetTokenHash,
      verifiedAt: { not: null },
      usedAt: null,
      resetTokenExpiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (
    !resetCodeRecord ||
    !resetCodeRecord.user ||
    resetCodeRecord.user.deletedAt
  ) {
    throw new AppError("Reset link expired. Please start again.", 400);
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    // 1. Update user passwordHash, clear mustChangePassword and tempPasswordExpiresAt
    await tx.user.update({
      where: { id: resetCodeRecord.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
      },
    });

    // 2. Mark this code used
    await tx.passwordResetCode.update({
      where: { id: resetCodeRecord.id },
      data: {
        usedAt: new Date(),
      },
    });

    // 3. Delete other reset codes for this user
    await tx.passwordResetCode.deleteMany({
      where: {
        userId: resetCodeRecord.userId,
        id: { not: resetCodeRecord.id },
      },
    });

    // 4. Revoke ALL active refresh tokens
    await tx.refreshToken.deleteMany({
      where: { userId: resetCodeRecord.userId },
    });

    // 5. Record audit log
    await tx.auditLog.create({
      data: {
        actorId: resetCodeRecord.userId,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "User",
        entityId: resetCodeRecord.userId,
      },
    });
  });

  // Send passwordChanged email (failure must not fail the request)
  try {
    const emailContent = passwordChanged({
      name: resetCodeRecord.user.name,
    });
    await sendEmail({
      to: {
        email: resetCodeRecord.user.email,
        name: resetCodeRecord.user.name,
      },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (err) {
    console.error(
      "[Auth] Failed to send password changed notification email:",
      err,
    );
  }
};
