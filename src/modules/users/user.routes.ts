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

router.get("/me", getMeHandler);
router.patch("/me", validate(updateProfileSchema), updateProfileHandler);
router.patch(
  "/me/password",
  validate(changePasswordSchema),
  changePasswordHandler,
);
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
