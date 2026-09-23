import { z } from "zod";

export const staffApplicationSchema = z
  .object({
    requestedRole: z.enum(["TECHNICIAN", "MANAGER"], {
      message: "Requested role must be TECHNICIAN or MANAGER",
    }),
    departmentId: z.string().uuid("Invalid department ID format"),
    experience: z.string().optional(),
    qualification: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requestedRole === "MANAGER") {
      if (!data.experience?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["experience"],
          message: "Experience is required for manager applications",
        });
      }
      if (!data.qualification?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["qualification"],
          message: "Qualification is required for manager applications",
        });
      }
    }

    if (data.requestedRole === "TECHNICIAN") {
      if (data.experience !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["experience"],
          message: "Experience is only allowed for manager applications",
        });
      }
      if (data.qualification !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["qualification"],
          message: "Qualification is only allowed for manager applications",
        });
      }
    }
  });

export type StaffApplicationInput = z.infer<typeof staffApplicationSchema>;
