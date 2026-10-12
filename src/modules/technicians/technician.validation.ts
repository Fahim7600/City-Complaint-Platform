import { z } from "zod";

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
