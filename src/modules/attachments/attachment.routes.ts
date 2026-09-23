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
/** @swagger
 * /complaints/{complaintId}/attachments:
 *   post:
 *     summary: Upload complaint attachments
 *     tags: [Attachments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: complaintId, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {multipart/form-data: {schema: {type: object, required: [type, files], properties: {type: {type: string}, files: {type: array, items: {type: string, format: binary}}}}}}}
 *     responses: {201: {description: Uploaded}, 400: {description: Upload or validation failure}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.post(
  "/complaints/:complaintId/attachments",
  authenticate,
  upload.array("files", 10),
  handleUploadError,
  validate(uploadAttachmentSchema),
  addAttachmentsHandler,
);

// GET /api/v1/complaints/:complaintId/attachments
/** @swagger
 * /complaints/{complaintId}/attachments:
 *   get:
 *     summary: List complaint attachments
 *     tags: [Attachments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: complaintId, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Attachments}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.get(
  "/complaints/:complaintId/attachments",
  authenticate,
  listAttachmentsHandler,
);

// DELETE /api/v1/attachments/:id
/** @swagger
 * /attachments/{id}:
 *   delete:
 *     summary: Delete an attachment
 *     tags: [Attachments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Deleted}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.delete("/attachments/:id", authenticate, deleteAttachmentHandler);

export default router;
