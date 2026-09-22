import { AttachmentType } from "@prisma/client";
import { z } from "zod";

export const uploadAttachmentSchema = z.object({
  type: z.nativeEnum(AttachmentType, {
    message: "Type must be one of EVIDENCE, BEFORE_WORK, or AFTER_WORK",
  }),
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
