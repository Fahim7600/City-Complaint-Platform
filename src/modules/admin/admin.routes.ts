import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  deactivateUserController,
  getDashboardStatsController,
  listAuditLogsController,
  listUsersController,
  overrideUserRoleAndDepartmentController,
  reactivateUserController,
} from "./admin.controller";
import {
  auditLogQuerySchema,
  listUsersQuerySchema,
  overrideRoleSchema,
} from "./admin.validation";

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get("/users", validate(listUsersQuerySchema), listUsersController);
router.patch(
  "/users/:id/role",
  validate(overrideRoleSchema),
  overrideUserRoleAndDepartmentController,
);
router.patch("/users/:id/deactivate", deactivateUserController);
router.patch("/users/:id/reactivate", reactivateUserController);
router.get("/dashboard-stats", getDashboardStatsController);
router.get(
  "/audit-logs",
  validate(auditLogQuerySchema),
  listAuditLogsController,
);

export default router;
