import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  decideApplicationController,
  listPendingApplicationsController,
} from "./staffApplication.controller";
import { decideApplicationSchema } from "./staffApplication.validation";

const router = Router();

/** @swagger
 * /staff-applications/:
 *   get:
 *     summary: List pending staff applications
 *     tags: [Staff Applications]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Pending applications}, 401: {description: Unauthorized}, 403: {description: Manager or admin access required}}
 */
router.get(
  "/",
  authenticate,
  authorize(Role.MANAGER, Role.ADMIN),
  listPendingApplicationsController,
);
/** @swagger
 * /staff-applications/{id}:
 *   patch:
 *     summary: Approve or reject a staff application
 *     tags: [Staff Applications]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [decision], properties: {decision: {type: string, enum: [APPROVED, REJECTED]}, reason: {type: string}}}}}}
 *     responses: {200: {description: Decision saved}, 400: {description: Invalid decision}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch(
  "/:id",
  authenticate,
  authorize(Role.MANAGER, Role.ADMIN),
  validate(decideApplicationSchema),
  decideApplicationController,
);

export default router;
