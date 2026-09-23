import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  createCategoryController,
  deleteCategoryController,
  listCategoriesController,
  updateCategoryController,
} from "./category.controller";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));
/** @swagger
 * /admin/departments/{departmentId}/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: departmentId, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [name], properties: {name: {type: string}, description: {type: string}, slaHours: {type: integer, minimum: 1}}}}}}
 *     responses: {201: {description: Created}, 400: {description: Duplicate or invalid category}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Department not found}}
 */
router.post(
  "/admin/departments/:departmentId/categories",
  validate(createCategorySchema),
  createCategoryController,
);
/** @swagger
 * /admin/departments/{departmentId}/categories:
 *   get:
 *     summary: List department categories
 *     tags: [Categories]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: departmentId, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Categories}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Department not found}}
 */
router.get(
  "/admin/departments/:departmentId/categories",
  listCategoriesController,
);
/** @swagger
 * /admin/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, properties: {name: {type: string}, description: {type: string}, slaHours: {type: integer, minimum: 1}}}}}}
 *     responses: {200: {description: Updated}, 400: {description: Invalid update}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Not found}}
 */
router.patch(
  "/admin/categories/:id",
  validate(updateCategorySchema),
  updateCategoryController,
);
/** @swagger
 * /admin/categories/{id}:
 *   delete:
 *     summary: Soft-delete a category
 *     tags: [Categories]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Deleted}, 400: {description: Active complaints prevent deletion}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Not found}}
 */
router.delete("/admin/categories/:id", deleteCategoryController);

export default router;
