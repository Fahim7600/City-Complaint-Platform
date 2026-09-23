import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  checkOverdueSlasController,
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

/** @swagger
 * /admin/jobs/check-overdue-slas:
 *   post:
 *     summary: Run the overdue SLA scan manually
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: SLA scan summary}, 401: {description: Unauthorized}, 403: {description: Admin access required}}
 */
router.post("/jobs/check-overdue-slas", checkOverdueSlasController);

/** @swagger
 * /admin/users:
 *   get:
 *     summary: List users
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: query, name: page, schema: {type: integer, default: 1}}, {in: query, name: limit, schema: {type: integer, maximum: 50, default: 10}}, {in: query, name: role, schema: {type: string}}, {in: query, name: departmentId, schema: {type: string, format: uuid}}, {in: query, name: approvalStatus, schema: {type: string}}, {in: query, name: search, schema: {type: string}}, {in: query, name: includeDeleted, schema: {type: boolean}}]
 *     responses: {200: {description: Users}, 401: {description: Unauthorized}, 403: {description: Admin access required}}
 */
router.get("/users", validate(listUsersQuerySchema), listUsersController);
/** @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Override a user's role and department
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [role], properties: {role: {type: string, enum: [CITIZEN, TECHNICIAN, MANAGER]}, departmentId: {type: string, format: uuid}}}}}}
 *     responses: {200: {description: Updated user}, 400: {description: Invalid role}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch(
  "/users/:id/role",
  validate(overrideRoleSchema),
  overrideUserRoleAndDepartmentController,
);
/** @swagger
 * /admin/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Deactivated}, 400: {description: Last admin protection}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch("/users/:id/deactivate", deactivateUserController);
/** @swagger
 * /admin/users/{id}/reactivate:
 *   patch:
 *     summary: Reactivate a user
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Reactivated}, 400: {description: User is active}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch("/users/:id/reactivate", reactivateUserController);
/** @swagger
 * /admin/dashboard-stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Dashboard statistics}, 401: {description: Unauthorized}, 403: {description: Admin access required}}
 */
router.get("/dashboard-stats", getDashboardStatsController);
/** @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: List audit logs
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Audit logs}, 401: {description: Unauthorized}, 403: {description: Admin access required}}
 */
router.get(
  "/audit-logs",
  validate(auditLogQuerySchema),
  listAuditLogsController,
);

export default router;
