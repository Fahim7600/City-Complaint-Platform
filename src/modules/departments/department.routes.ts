import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { staffInviteLimiter } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate";
import {
  createDepartmentController,
  deleteDepartmentController,
  getDepartmentByIdController,
  inviteTechnicianController,
  listAllDepartmentsController,
  listDepartmentsController,
  listMyDepartmentTechniciansController,
  removeTechnicianController,
  resendInviteManagerController,
  updateDepartmentController,
} from "./department.controller";
import {
  createDepartmentSchema,
  managerInviteTechnicianSchema,
  updateDepartmentSchema,
} from "./department.validation";

const router = Router();
export const departmentAdminRoutes = Router();

/** @swagger
 * /departments/:
 *   get:
 *     summary: List public departments
 *     tags: [Departments]
 *     responses: {200: {description: Department id and name list}}
 */
router.get("/", listDepartmentsController);

/** @swagger
 * /departments/my/technicians:
 *   get:
 *     summary: List technicians in the authenticated manager's department
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     responses:
 *       200: {description: List of department technicians with invitePending status}
 *       401: {description: Unauthorized}
 *       403: {description: Manager access required}
 */
router.get(
  "/my/technicians",
  authenticate,
  authorize(Role.MANAGER),
  listMyDepartmentTechniciansController,
);

/** @swagger
 * /departments/my/technicians:
 *   post:
 *     summary: Invite a technician to the authenticated manager's department
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: {type: string, minLength: 2, maxLength: 100}
 *               email: {type: string, format: email}
 *               phone: {type: string}
 *     responses:
 *       201: {description: Technician invited successfully with temporary password email sent}
 *       400: {description: Validation failure}
 *       401: {description: Unauthorized}
 *       403: {description: Manager access required}
 *       409: {description: User with email already exists}
 *       429: {description: Too many requests}
 *       502: {description: Failed to send invitation email}
 */
router.post(
  "/my/technicians",
  authenticate,
  authorize(Role.MANAGER),
  staffInviteLimiter,
  validate(managerInviteTechnicianSchema),
  inviteTechnicianController,
);

/** @swagger
 * /departments/my/technicians/{id}:
 *   delete:
 *     summary: Remove a technician from the manager's department
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string, format: uuid}
 *     responses:
 *       200: {description: Technician removed successfully}
 *       400: {description: Invalid ID}
 *       401: {description: Unauthorized}
 *       403: {description: Manager access required}
 *       404: {description: Technician not found in department}
 *       409: {description: Blocked by active assigned or in-progress complaints}
 */
router.delete(
  "/my/technicians/:id",
  authenticate,
  authorize(Role.MANAGER),
  removeTechnicianController,
);

/** @swagger
 * /departments/my/technicians/{id}/resend-invite:
 *   post:
 *     summary: Resend invitation email with new temporary password to a technician
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string, format: uuid}
 *     responses:
 *       200: {description: Invitation resent successfully}
 *       400: {description: Invalid ID}
 *       401: {description: Unauthorized}
 *       403: {description: Manager access required}
 *       404: {description: Technician not found}
 *       409: {description: User has already set their password}
 *       429: {description: Too many requests}
 *       502: {description: Failed to send invitation email}
 */
router.post(
  "/my/technicians/:id/resend-invite",
  authenticate,
  authorize(Role.MANAGER),
  staffInviteLimiter,
  resendInviteManagerController,
);

departmentAdminRoutes.use(
  "/admin/departments",
  authenticate,
  authorize(Role.ADMIN),
);
/** @swagger
 * /admin/departments:
 *   post:
 *     summary: Create a department
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [name], properties: {name: {type: string}, description: {type: string}}}}}}
 *     responses: {201: {description: Created}, 400: {description: Duplicate or invalid name}, 401: {description: Unauthorized}, 403: {description: Admin access required}}
 */
departmentAdminRoutes.post(
  "/admin/departments",
  validate(createDepartmentSchema),
  createDepartmentController,
);
/** @swagger
 * /admin/departments:
 *   get:
 *     summary: List all departments
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: query, name: includeDeleted, schema: {type: boolean, default: false}}]
 *     responses: {200: {description: Departments}, 401: {description: Unauthorized}, 403: {description: Admin access required}}
 */
departmentAdminRoutes.get("/admin/departments", listAllDepartmentsController);
/** @swagger
 * /admin/departments/{id}:
 *   get:
 *     summary: Get a department and its active categories
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Department}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Not found}}
 */
departmentAdminRoutes.get(
  "/admin/departments/:id",
  getDepartmentByIdController,
);
/** @swagger
 * /admin/departments/{id}:
 *   patch:
 *     summary: Update a department
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, properties: {name: {type: string}, description: {type: string}}}}}}
 *     responses: {200: {description: Updated}, 400: {description: Invalid update}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Not found}}
 */
departmentAdminRoutes.patch(
  "/admin/departments/:id",
  validate(updateDepartmentSchema),
  updateDepartmentController,
);
/** @swagger
 * /admin/departments/{id}:
 *   delete:
 *     summary: Soft-delete a department
 *     tags: [Departments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Deleted}, 400: {description: Active complaints prevent deletion}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Not found}}
 */
departmentAdminRoutes.delete(
  "/admin/departments/:id",
  deleteDepartmentController,
);

export default router;
