import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { handleUploadError, upload } from "../../middlewares/upload.middleware";
import { validate } from "../../middlewares/validate";
import {
  addAttachmentsHandler,
  deleteAttachmentHandler,
  listAttachmentsHandler,
} from "./attachment.controller";
import { uploadAttachmentSchema } from "./attachment.validation";

const router = Router();

// POST /api/v1/complaints/:complaintId/attachments
router.post(
  "/complaints/:complaintId/attachments",
  authenticate,
  upload.array("files", 10),
  handleUploadError,
  validate(uploadAttachmentSchema),
  addAttachmentsHandler,
);

// GET /api/v1/complaints/:complaintId/attachments
router.get(
  "/complaints/:complaintId/attachments",
  authenticate,
  listAttachmentsHandler,
);

// DELETE /api/v1/attachments/:id
router.delete("/attachments/:id", authenticate, deleteAttachmentHandler);

export default router;
