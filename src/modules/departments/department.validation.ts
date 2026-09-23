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
