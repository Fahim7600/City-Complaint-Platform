import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  assignTechnicianHandler,
  cancelComplaintHandler,
  createComplaintHandler,
  getComplaintByIdHandler,
  listComplaintsHandler,
  listMyAssignedHandler,
  searchComplaintsHandler,
  softDeleteComplaintHandler,
  updateComplaintHandler,
  updateStatusHandler,
} from "./complaint.controller";
import {
  assignSchema,
  createComplaintSchema,
  statusUpdateSchema,
} from "./complaint.validation";

const router = Router();

// 1. Create complaint (Citizen only)
router.post(
  "/",
  authenticate,
  authorize(Role.CITIZEN),
  validate(createComplaintSchema),
  createComplaintHandler,
);

// 2. List complaints
router.get("/", authenticate, listComplaintsHandler);

// 3. Search complaints (MUST be defined before /:id)
router.get("/search", authenticate, searchComplaintsHandler);

// 4. List my assigned complaints (Technician only, MUST be defined before /:id)
router.get(
  "/my-assigned",
  authenticate,
  authorize(Role.TECHNICIAN),
  listMyAssignedHandler,
);

// 5. Get complaint by ID
router.get("/:id", authenticate, getComplaintByIdHandler);

// 6. Update complaint (Citizen edit or Manager/Admin re-triage)
router.patch("/:id", authenticate, updateComplaintHandler);

// 7. Assign technician (Manager or Admin)
router.post(
  "/:id/assign",
  authenticate,
  authorize(Role.MANAGER, Role.ADMIN),
  validate(assignSchema),
  assignTechnicianHandler,
);

// 8. Update complaint status
router.patch(
  "/:id/status",
  authenticate,
  validate(statusUpdateSchema),
  updateStatusHandler,
);

// 9. Cancel complaint (Citizen only)
router.post(
  "/:id/cancel",
  authenticate,
  authorize(Role.CITIZEN),
  cancelComplaintHandler,
);

// 10. Soft delete complaint (Admin only)
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  softDeleteComplaintHandler,
);

export default router;
