import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
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

export default router;
