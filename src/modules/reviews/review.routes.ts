import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import {
  createReviewController,
  getReviewController,
  getTechnicianRatingController,
} from "./review.controller";
import { createReviewSchema } from "./review.validation";

const router = Router();

router.post(
  "/complaints/:complaintId/review",
  authenticate,
  authorize(Role.CITIZEN),
  validate(createReviewSchema),
  createReviewController,
);
router.get(
  "/complaints/:complaintId/review",
  authenticate,
  getReviewController,
);
router.get(
  "/technicians/:id/rating",
  authenticate,
  getTechnicianRatingController,
);

export default router;
