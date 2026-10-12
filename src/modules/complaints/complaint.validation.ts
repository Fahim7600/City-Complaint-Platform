import { ComplaintStatus, Priority } from "@prisma/client";
import { z } from "zod";

export const createComplaintSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters long"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long"),
  categoryId: z.string().uuid("Invalid category ID format"),
  location: z.string().trim().min(1, "Location is required"),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
});

export const updateComplaintSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters long")
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters long")
      .optional(),
    categoryId: z.string().uuid("Invalid category ID format").optional(),
    location: z.string().trim().min(1, "Location cannot be empty").optional(),
    priority: z.nativeEnum(Priority).optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0 &&
      Object.values(data).some((val) => val !== undefined),
    {
      message: "At least one field must be provided for update",
    },
  );

export const reTriageSchema = z.object({
  priority: z.nativeEnum(Priority, {
    message: "Priority is required for re-triaging",
  }),
});

export const assignSchema = z.object({
  technicianId: z.string().uuid("Invalid technician ID format"),
});

export const statusUpdateSchema = z.object({
  status: z.nativeEnum(ComplaintStatus, {
    message: "Status is required",
  }),
  note: z.string().trim().optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.nativeEnum(ComplaintStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.string().uuid("Invalid category ID format").optional(),
  overdue: z.preprocess((val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  }, z.boolean().optional()),
  sortBy: z.enum(["createdAt", "slaDueAt", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().trim().optional(),
});

export const reopenComplaintSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Reopen reason must be at least 5 characters long")
    .max(500, "Reopen reason cannot exceed 500 characters"),
});

export const escalateComplaintSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Escalation reason must be at least 5 characters long")
    .max(500, "Escalation reason cannot exceed 500 characters"),
});

export const clearEscalationSchema = z.object({
  note: z
    .string()
    .trim()
    .max(500, "Note cannot exceed 500 characters")
    .optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
export type ReTriageInput = z.infer<typeof reTriageSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type ReopenComplaintInput = z.infer<typeof reopenComplaintSchema>;
export type EscalateComplaintInput = z.infer<typeof escalateComplaintSchema>;
export type ClearEscalationInput = z.infer<typeof clearEscalationSchema>;
