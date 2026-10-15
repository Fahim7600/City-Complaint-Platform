import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional(),
});

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.name === undefined && data.description === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
      });
    }
  });

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const managerInviteTechnicianSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().optional(),
});

export const adminInviteStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().optional(),
  role: z.enum(["TECHNICIAN", "MANAGER"], {
    message: "Role must be TECHNICIAN or MANAGER",
  }),
  departmentId: z.string().uuid("Invalid department ID"),
});

export type ManagerInviteTechnicianInput = z.infer<
  typeof managerInviteTechnicianSchema
>;
export type AdminInviteStaffInput = z.infer<typeof adminInviteStaffSchema>;
