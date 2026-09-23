import { Router } from "express";
import adminRoutes from "../modules/admin/admin.routes";
import attachmentRoutes from "../modules/attachments/attachment.routes";
import authRoutes from "../modules/auth/auth.routes";
import complaintRoutes from "../modules/complaints/complaint.routes";
import departmentRoutes from "../modules/departments/department.routes";
import paymentRoutes from "../modules/payments/payment.routes";
import reviewRoutes from "../modules/reviews/review.routes";
import staffApplicationRoutes from "../modules/staffApplications/staffApplication.routes";
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
router.use("/admin", adminRoutes);
router.use("/users", userRoutes);
router.use("/complaints", complaintRoutes);
router.use("/payments", paymentRoutes);
router.use("/", reviewRoutes);
router.use("/departments", departmentRoutes);
router.use("/staff-applications", staffApplicationRoutes);
// Attachment routes own their own full paths (/complaints/:id/attachments and /attachments/:id)
router.use("/", attachmentRoutes);

export default router;
