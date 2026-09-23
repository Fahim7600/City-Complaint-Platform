import { Router } from "express";
import attachmentRoutes from "../modules/attachments/attachment.routes";
import authRoutes from "../modules/auth/auth.routes";
import complaintRoutes from "../modules/complaints/complaint.routes";
import paymentRoutes from "../modules/payments/payment.routes";
import reviewRoutes from "../modules/reviews/review.routes";
import userRoutes from "../modules/users/user.routes";
import { successResponse } from "../utils/response";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json(
    successResponse("Server is healthy", {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/complaints", complaintRoutes);
router.use("/payments", paymentRoutes);
router.use("/", reviewRoutes);
// Attachment routes own their own full paths (/complaints/:id/attachments and /attachments/:id)
router.use("/", attachmentRoutes);

export default router;
