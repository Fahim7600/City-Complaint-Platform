import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  createReviewController,
  getReviewController,
  getTechnicianRatingController,
} from "./review.controller";
import { createReviewSchema } from "./review.validation";

const router = Router();

/** @swagger
 * /complaints/{complaintId}/review:
 *   post:
 *     summary: Submit an immutable complaint review
 *     tags: [Reviews]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: complaintId, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [rating], properties: {rating: {type: integer, minimum: 1, maximum: 5}, comment: {type: string, maxLength: 1000}}}}}}
 *     responses: {201: {description: Review submitted}, 400: {description: Invalid review}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.post(
  "/complaints/:complaintId/review",
  authenticate,
  authorize(Role.CITIZEN),
  validate(createReviewSchema),
  createReviewController,
);
/** @swagger
 * /complaints/{complaintId}/review:
 *   get:
 *     summary: Get a complaint review
 *     tags: [Reviews]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: complaintId, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Review}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.get(
  "/complaints/:complaintId/review",
  authenticate,
  getReviewController,
);
/** @swagger
 * /technicians/{id}/rating:
 *   get:
 *     summary: Get technician rating
 *     tags: [Reviews]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Rating}, 401: {description: Unauthorized}, 404: {description: Technician not found}}
 */
router.get(
  "/technicians/:id/rating",
  authenticate,
  getTechnicianRatingController,
);

export default router;
