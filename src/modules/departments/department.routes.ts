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

router.get("/", listDepartmentsController);

departmentAdminRoutes.use(authenticate, authorize(Role.ADMIN));
departmentAdminRoutes.post(
  "/admin/departments",
  validate(createDepartmentSchema),
  createDepartmentController,
);
departmentAdminRoutes.get("/admin/departments", listAllDepartmentsController);
departmentAdminRoutes.get(
  "/admin/departments/:id",
  getDepartmentByIdController,
);
departmentAdminRoutes.patch(
  "/admin/departments/:id",
  validate(updateDepartmentSchema),
  updateDepartmentController,
);
departmentAdminRoutes.delete(
  "/admin/departments/:id",
  deleteDepartmentController,
);

export default router;
