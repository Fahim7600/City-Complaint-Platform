import crypto from "node:crypto";
import { Role, type User } from "@prisma/client";
import bcrypt from "bcrypt";
import type { Response } from "express";
import { type LoginTicket, OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import type { CustomError } from "../../middlewares/errorHandler";
import { sanitizeUser } from "../../utils/sanitizeUser";
import type {
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
} from "./auth.validation";
import { submitStaffApplication } from "./staffApplication.service";

export const BCRYPT_SALT_ROUNDS = 12;
export {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  clearRefreshCookie,
} from "./refreshCookie";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  refreshCookieOptions,
} from "./refreshCookie";

export class AppError extends Error implements CustomError {
  statusCode: number;
  errors?: unknown;

  constructor(message: string, statusCode = 400, errors?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const issueTokens = async (
  user: User,
  res: Response,
): Promise<string> => {
  // 1. Sign Access Token
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"] },
  );

  // 2. Sign Refresh Token with random jti
  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { userId: user.id, jti },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"] },
  );

  // 3. Decode refresh token to get exact expiration date
  const decoded = jwt.decode(refreshToken) as { exp?: number };
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const tokenHash = hashToken(refreshToken);

  // 4. Save hashed refresh token in database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // 5. Set refresh token as httpOnly cookie
  const maxAgeMs = expiresAt.getTime() - Date.now();
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    refreshCookieOptions(maxAgeMs > 0 ? maxAgeMs : undefined),
  );

  // 6. Return access token only
  return accessToken;
};

export const registerUser = async (input: RegisterInput, res: Response) => {
  const { name, email, password, staffApplication } = input;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email is already registered", 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Always CITIZEN role on register
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.CITIZEN,
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
    },
  });

  const registeredUser = staffApplication
    ? await submitStaffApplication(user.id, staffApplication)
    : sanitizeUser(user);

  // Issue tokens
  const accessToken = await issueTokens(user, res);

  return {
    user: registeredUser,
    accessToken,
  };
};

export const loginUser = async (input: LoginInput, res: Response) => {
  const { email, password } = input;

  const genericAuthError = new AppError("Invalid email or password", 401);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    throw genericAuthError;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw genericAuthError;
  }

  if (
    user.mustChangePassword &&
    user.tempPasswordExpiresAt &&
    user.tempPasswordExpiresAt < new Date()
  ) {
    throw new AppError(
      "Your temporary password has expired. Ask your manager or admin to resend the invitation.",
      401,
    );
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
    },
  });

  // Issue tokens
  const accessToken = await issueTokens(user, res);

  return {
    user: sanitizeUser(user),
    accessToken,
  };
};

export const googleAuth = async (input: GoogleAuthInput, res: Response) => {
  const { idToken } = input;

  const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

  let ticket: LoginTicket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });
  } catch (_err) {
    throw new AppError("Invalid Google ID token", 400);
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new AppError("Invalid Google account payload", 400);
  }

  const { email, name, sub } = payload;

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    if (user.googleId && user.googleId !== sub) {
      throw new AppError("Google account mismatch", 400);
    }

    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: sub },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        name: name || "Google User",
        email,
        googleId: sub,
        passwordHash: null,
        role: Role.CITIZEN,
      },
    });
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
    },
  });

  // Issue tokens
  const accessToken = await issueTokens(user, res);

  return {
    user: sanitizeUser(user),
    accessToken,
  };
};

export const refreshUserToken = async (
  tokenFromCookie: string | undefined,
  res: Response,
) => {
  if (!tokenFromCookie) {
    throw new AppError("Refresh token missing", 401);
  }

  let decoded: { userId: string; jti: string };
  try {
    decoded = jwt.verify(tokenFromCookie, config.JWT_REFRESH_SECRET) as {
      userId: string;
      jti: string;
    };
  } catch (_err) {
    clearRefreshCookie(res);
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokenHash = hashToken(tokenFromCookie);
  const dbToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!dbToken) {
    clearRefreshCookie(res);
    throw new AppError("Refresh token not found", 401);
  }

  // Reuse detection: If valid JWT but DB row is already revoked, security breach!
  if (dbToken.revokedAt !== null) {
    // Revoke ALL active refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: decoded.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearRefreshCookie(res);
    throw new AppError(
      "Refresh token reuse detected. All sessions revoked.",
      401,
    );
  }

  if (dbToken.expiresAt < new Date()) {
    clearRefreshCookie(res);
    throw new AppError("Refresh token expired", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || user.deletedAt) {
    clearRefreshCookie(res);
    throw new AppError("User not found or deactivated", 401);
  }

  // Soft revoke old refresh token
  await prisma.refreshToken.update({
    where: { id: dbToken.id },
    data: { revokedAt: new Date() },
  });

  // Issue new pair of tokens
  const newAccessToken = await issueTokens(user, res);

  return {
    accessToken: newAccessToken,
  };
};

export const logoutUser = async (
  tokenFromCookie: string | undefined,
  res: Response,
) => {
  if (tokenFromCookie) {
    const tokenHash = hashToken(tokenFromCookie);
    const dbToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (dbToken && !dbToken.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { revokedAt: new Date() },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: dbToken.userId,
          action: "USER_LOGOUT",
          entityType: "User",
          entityId: dbToken.userId,
        },
      });
    }
  }

  // Clear cookie regardless
  clearRefreshCookie(res);
};
