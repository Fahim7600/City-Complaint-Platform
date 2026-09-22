import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[\d\+\-\s\(\)]+$/, "Invalid phone number format")
      .min(7, "Phone number must be at least 7 characters long")
      .optional(),
    avatarUrl: z.string().trim().url("Invalid avatar URL format").optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0 &&
      Object.values(data).some((val) => val !== undefined),
    {
      message: "At least one field must be provided for profile update",
    },
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long"),
  })
  .refine(
    (data) =>
      !(data.currentPassword && data.currentPassword === data.newPassword),
    {
      message: "New password cannot be identical to current password",
      path: ["newPassword"],
    },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
