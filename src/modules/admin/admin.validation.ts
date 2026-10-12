import { Role, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

export const overrideRoleSchema = z
  .object({
    role: z.enum(["CITIZEN", "TECHNICIAN", "MANAGER"]),
    departmentId: z.string().uuid("Invalid department ID format").optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.role === "TECHNICIAN" || data.role === "MANAGER") &&
      !data.departmentId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: "Department is required for staff roles",
      });
    }
    if (data.role === "CITIZEN" && data.departmentId !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: "Department must be omitted for citizen users",
      });
    }
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().uuid("Invalid department ID format").optional(),
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  search: z.string().optional(),
  includeDeleted: z.coerce.boolean().default(false),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().uuid("Invalid actor ID format").optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  userId: z.string().uuid("Invalid user ID format").optional(),
});

export const listEscalatedComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type OverrideRoleInput = z.infer<typeof overrideRoleSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type ListEscalatedComplaintsQuery = z.infer<
  typeof listEscalatedComplaintsQuerySchema
>;
