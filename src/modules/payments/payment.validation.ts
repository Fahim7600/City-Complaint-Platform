import { z } from "zod";

export const confirmSessionSchema = z.object({
  sessionId: z
    .string()
    .regex(/^cs_(test|live)_[A-Za-z0-9_]+$/, "Invalid session ID format"),
});
