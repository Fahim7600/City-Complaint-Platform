import { z } from "zod";
import { staffApplicationSchema } from "./staffApplication.validation";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  staffApplication: staffApplicationSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const googleAuthSchema = z.object({
  idToken: z.string().trim().min(1, "Google ID token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().trim().min(1, "Reset token is required"),
  newPassword: registerSchema.shape.password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
