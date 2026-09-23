import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  createDepartmentController,
  deleteDepartmentController,
  getDepartmentByIdController,
  listAllDepartmentsController,
  listDepartmentsController,
  updateDepartmentController,
} from "./department.controller";
import {
  createDepartmentSchema,
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
