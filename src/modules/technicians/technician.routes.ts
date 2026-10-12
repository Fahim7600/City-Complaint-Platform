import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  getPerformanceHandler,
  updateAvailabilityHandler,
} from "./technician.controller";
import { updateAvailabilitySchema } from "./technician.validation";

const router = Router();

router.use(authenticate, authorize(Role.TECHNICIAN));

/** @swagger
 * /technicians/me/availability:
 *   patch:
 *     summary: Update authenticated technician availability
 *     tags: [Technicians]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isAvailable]
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 description: Whether technician is available for new complaint assignments
 *     responses:
 *       200: {description: Availability updated successfully}
 *       400: {description: Validation failure}
 *       401: {description: Unauthorized}
 *       403: {description: Technician access required}
 */
router.patch(
  "/me/availability",
  validate(updateAvailabilitySchema),
  updateAvailabilityHandler,
);

/** @swagger
 * /technicians/me/performance:
 *   get:
 *     summary: Get live performance metrics for the authenticated technician
 *     tags: [Technicians]
 *     security: [{bearerAuth: []}]
 *     responses:
 *       200: {description: Performance metrics retrieved successfully}
 *       401: {description: Unauthorized}
 *       403: {description: Technician access required}
 */
router.get("/me/performance", getPerformanceHandler);

export default router;
