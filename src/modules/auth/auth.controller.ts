import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import {
  googleAuth,
  loginUser,
  logoutUser,
  refreshUserToken,
  registerUser,
} from "./auth.service";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from "./auth.validation";
import {
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
} from "./passwordReset.service";

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await registerUser(req.body, res);
    res
      .status(201)
      .json(successResponse("User registered successfully", result));
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await loginUser(req.body, res);
    res.status(200).json(successResponse("Login successful", result));
  } catch (error) {
    next(error);
  }
};

export const googleAuthHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await googleAuth(req.body, res);
    res
      .status(200)
      .json(successResponse("Google authentication successful", result));
  } catch (error) {
    next(error);
  }
};

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshTokenCookie = req.cookies?.refreshToken;
    const result = await refreshUserToken(refreshTokenCookie, res);
    res
      .status(200)
      .json(successResponse("Token refreshed successfully", result));
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshTokenCookie = req.cookies?.refreshToken;
    await logoutUser(refreshTokenCookie, res);
    res.status(200).json(successResponse("Logged out successfully"));
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(input);
    res
      .status(200)
      .json(
        successResponse(
          "If an account exists for this email, we've sent a 6-digit code.",
          result,
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const verifyResetCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = verifyResetCodeSchema.parse(req.body);
    const result = await verifyResetCode(input);
    res.status(200).json(successResponse("Code verified successfully", result));
  } catch (error) {
    next(error);
  }
};

export const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await resetPassword(input);
    res
      .status(200)
      .json(
        successResponse(
          "Password updated. Please sign in with your new password.",
        ),
      );
  } catch (error) {
    next(error);
  }
};
