import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import { clearEscalationSchema } from "../complaints/complaint.validation";
import {
  checkOverdueSlasController,
  deactivateUserController,
  getDashboardStatsController,
  listAuditLogsController,
  listPaymentsController,
  listUsersController,
  overrideUserRoleAndDepartmentController,
  reactivateUserController,
} from "./admin.controller";
import {
  auditLogQuerySchema,
  listPaymentsQuerySchema,
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

/** @swagger
 * /admin/payments:
 *   get:
 *     summary: List subscriptions and payment history
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: {type: integer, default: 1}
 *       - in: query
 *         name: limit
 *         schema: {type: integer, maximum: 50, default: 10}
 *       - in: query
 *         name: status
 *         schema: {type: string, enum: [ACTIVE, CANCELED, PAST_DUE, INCOMPLETE]}
 *       - in: query
 *         name: userId
 *         schema: {type: string, format: uuid}
 *     responses:
 *       200: {description: Subscriptions and payments retrieved successfully}
 *       400: {description: Validation failure}
 *       401: {description: Unauthorized}
 *       403: {description: Admin access required}
 */
router.get("/payments", listPaymentsController);

/** @swagger
 * /admin/escalated-complaints:
 *   get:
 *     summary: List escalated complaints queue
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: {type: integer, default: 1}
 *       - in: query
 *         name: limit
 *         schema: {type: integer, maximum: 50, default: 10}
 *     responses:
 *       200: {description: Escalated complaints retrieved successfully}
 *       400: {description: Validation failure}
 *       401: {description: Unauthorized}
 *       403: {description: Admin access required}
 */
router.get(
  "/escalated-complaints",
  validate(listEscalatedComplaintsQuerySchema),
  listEscalatedComplaintsController,
);

/** @swagger
 * /admin/complaints/{id}/clear-escalation:
 *   patch:
 *     summary: Clear complaint escalation
 *     tags: [Admin]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string, format: uuid}
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note: {type: string}
 *     responses:
 *       200: {description: Escalation cleared successfully}
 *       400: {description: Complaint is not escalated or invalid ID}
 *       401: {description: Unauthorized}
 *       403: {description: Admin access required}
 *       404: {description: Complaint not found}
 */
router.patch(
  "/complaints/:id/clear-escalation",
  validate(clearEscalationSchema),
  clearEscalationController,
);

export default router;
