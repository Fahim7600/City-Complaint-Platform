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
router.post(
  "/admin/departments/:departmentId/categories",
  validate(createCategorySchema),
  createCategoryController,
);
router.get(
  "/admin/departments/:departmentId/categories",
  listCategoriesController,
);
router.patch(
  "/admin/categories/:id",
  validate(updateCategorySchema),
  updateCategoryController,
);
router.delete("/admin/categories/:id", deleteCategoryController);

export default router;
