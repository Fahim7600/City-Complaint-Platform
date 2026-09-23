import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import { submitStaffApplication } from "../auth/staffApplication.service";
import { staffApplicationSchema } from "../auth/staffApplication.validation";
import {
  changePasswordHandler,
  getMeHandler,
  updateProfileHandler,
} from "./user.controller";
import { changePasswordSchema, updateProfileSchema } from "./user.validation";

const router = Router();

// Apply authenticate to all /users endpoints
router.use(authenticate);

/** @swagger
 * /users/me:
 *   get:
 *     summary: Get the authenticated profile
 *     tags: [Users]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Profile}, 401: {description: Unauthorized}, 404: {description: User not found}}
 */
router.get("/me", getMeHandler);
/** @swagger
 * /users/me:
 *   patch:
 *     summary: Update the authenticated profile
 *     tags: [Users]
 *     security: [{bearerAuth: []}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, properties: {name: {type: string}, phone: {type: string}, avatarUrl: {type: string, format: uri}}}}}}
 *     responses: {200: {description: Updated profile}, 400: {description: Validation failure}, 401: {description: Unauthorized}}
 */
router.patch("/me", validate(updateProfileSchema), updateProfileHandler);
/** @swagger
 * /users/me/password:
 *   patch:
 *     summary: Change the authenticated password
 *     tags: [Users]
 *     security: [{bearerAuth: []}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [newPassword], properties: {currentPassword: {type: string}, newPassword: {type: string}}}}}}
 *     responses: {200: {description: Password changed}, 400: {description: Validation failure}, 401: {description: Unauthorized}}
 */
router.patch(
  "/me/password",
  validate(changePasswordSchema),
  changePasswordHandler,
);
/** @swagger
 * /users/me/staff-application:
 *   post:
 *     summary: Submit a technician or manager application
 *     tags: [Users]
 *     security: [{bearerAuth: []}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [requestedRole, departmentId], properties: {requestedRole: {type: string, enum: [TECHNICIAN, MANAGER]}, departmentId: {type: string, format: uuid}, experience: {type: string}, qualification: {type: string}}}}}}
 *     responses: {200: {description: Application submitted}, 400: {description: Invalid application}, 401: {description: Unauthorized}, 403: {description: Citizen access required}}
 */
router.post(
  "/me/staff-application",
  authorize(Role.CITIZEN),
  validate(staffApplicationSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Unauthorized", 401);
      const result = await submitStaffApplication(req.user.userId, req.body);
      res
        .status(200)
        .json(
          successResponse("Staff application submitted successfully", result),
        );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
