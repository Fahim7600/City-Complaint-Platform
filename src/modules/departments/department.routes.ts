import { Router } from "express";
import { listDepartmentsController } from "./department.controller";

const router = Router();

router.get("/", listDepartmentsController);

export default router;
