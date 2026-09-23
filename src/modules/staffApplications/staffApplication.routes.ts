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

router.get(
  "/",
  authenticate,
  authorize(Role.MANAGER, Role.ADMIN),
  listPendingApplicationsController,
);
router.patch(
  "/:id",
  authenticate,
  authorize(Role.MANAGER, Role.ADMIN),
  validate(decideApplicationSchema),
  decideApplicationController,
);

export default router;
