import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional(),
  slaHours: z.number().int().positive().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    description: z.string().optional(),
    slaHours: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.name === undefined &&
      data.description === undefined &&
      data.slaHours === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
      });
    }
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
