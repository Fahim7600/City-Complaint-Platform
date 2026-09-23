import { z } from "zod";

export const decideApplicationSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "REJECTED" && !data.reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is required when rejecting an application",
      });
    }
  });

export type DecideApplicationInput = z.infer<typeof decideApplicationSchema>;
