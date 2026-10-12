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
/** @swagger
 * /complaints/:
 *   post:
 *     summary: Create a complaint
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [title, description, categoryId, location], properties: {title: {type: string}, description: {type: string}, categoryId: {type: string, format: uuid}, location: {type: string}, priority: {type: string, enum: [LOW, MEDIUM, HIGH]}}}}}}
 *     responses: {201: {description: Created}, 400: {description: Validation failure}, 401: {description: Unauthorized}, 403: {description: Forbidden}}
 */
router.post(
  "/",
  authenticate,
  authorize(Role.CITIZEN),
  validate(createComplaintSchema),
  createComplaintHandler,
);

// 2. List complaints
/** @swagger
 * /complaints/:
 *   get:
 *     summary: List visible complaints
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: query, name: page, schema: {type: integer, default: 1}}, {in: query, name: limit, schema: {type: integer, maximum: 50, default: 10}}, {in: query, name: status, schema: {type: string}}, {in: query, name: priority, schema: {type: string}}, {in: query, name: categoryId, schema: {type: string, format: uuid}}, {in: query, name: overdue, schema: {type: boolean}}, {in: query, name: q, schema: {type: string}}]
 *     responses: {200: {description: Complaint list}, 401: {description: Unauthorized}}
 */
router.get("/", authenticate, listComplaintsHandler);

// 3. Search complaints (MUST be defined before /:id)
/** @swagger
 * /complaints/search:
 *   get:
 *     summary: Search visible complaints
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: query, name: q, required: true, schema: {type: string}}]
 *     responses: {200: {description: Search results}, 400: {description: Missing query}, 401: {description: Unauthorized}}
 */
router.get("/search", authenticate, searchComplaintsHandler);

// 4. List my assigned complaints (Technician only, MUST be defined before /:id)
/** @swagger
 * /complaints/my-assigned:
 *   get:
 *     summary: List complaints assigned to the technician
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Assigned complaints}, 401: {description: Unauthorized}, 403: {description: Technician access required}}
 */
router.get(
  "/my-assigned",
  authenticate,
  authorize(Role.TECHNICIAN),
  listMyAssignedHandler,
);

// 5. Get complaint by ID
/** @swagger
 * /complaints/{id}:
 *   get:
 *     summary: Get a complaint
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Complaint}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.get("/:id", authenticate, getComplaintByIdHandler);

// 6. Update complaint (Citizen edit or Manager/Admin re-triage)
/** @swagger
 * /complaints/{id}:
 *   patch:
 *     summary: Update a complaint or re-triage its priority
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object}}}}
 *     responses: {200: {description: Updated complaint}, 400: {description: Validation failure}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch("/:id", authenticate, updateComplaintHandler);

// 7. Assign technician (Manager or Admin)
/** @swagger
 * /complaints/{id}/assign:
 *   post:
 *     summary: Assign a technician
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [technicianId], properties: {technicianId: {type: string, format: uuid}}}}}}
 *     responses: {200: {description: Assigned complaint}, 400: {description: Invalid assignment}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.post(
  "/:id/assign",
  authenticate,
  authorize(Role.MANAGER, Role.ADMIN),
  validate(assignSchema),
  assignTechnicianHandler,
);

// 8. Update complaint status
/** @swagger
 * /complaints/{id}/status:
 *   patch:
 *     summary: Change complaint status
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [status], properties: {status: {type: string}, note: {type: string}}}}}}
 *     responses: {200: {description: Updated complaint}, 400: {description: Invalid transition}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch(
  "/:id/status",
  authenticate,
  validate(statusUpdateSchema),
  updateStatusHandler,
);

// 9. Cancel complaint (Citizen only)
/** @swagger
 * /complaints/{id}/cancel:
 *   post:
 *     summary: Cancel a pending complaint
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Cancelled}, 400: {description: Cannot cancel}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.post(
  "/:id/cancel",
  authenticate,
  authorize(Role.CITIZEN),
  cancelComplaintHandler,
);

// 10. Reopen complaint (Citizen only)
/** @swagger
 * /complaints/{id}/reopen:
 *   patch:
 *     summary: Reopen a resolved complaint within window
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [reason], properties: {reason: {type: string, minLength: 5, maxLength: 500}}}}}}
 *     responses: {200: {description: Reopened complaint}, 400: {description: Expired or invalid status}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.patch(
  "/:id/reopen",
  authenticate,
  authorize(Role.CITIZEN),
  validate(reopenComplaintSchema),
  reopenComplaintHandler,
);

// 11. Soft delete complaint (Admin only)
/** @swagger
 * /complaints/{id}:
 *   delete:
 *     summary: Soft-delete a complaint
 *     tags: [Complaints]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Deleted}, 401: {description: Unauthorized}, 403: {description: Admin access required}, 404: {description: Not found}}
 */
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  softDeleteComplaintHandler,
);

export default router;
