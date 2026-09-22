import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import {
  cancelSubscriptionHandler,
  checkoutCancelHandler,
  checkoutSuccessHandler,
  createCheckoutSessionHandler,
  getMySubscriptionHandler,
  getPaymentByIdHandler,
} from "./payment.controller";

const router = Router();

router.post(
  "/checkout-session",
  authenticate,
  authorize(Role.CITIZEN),
  createCheckoutSessionHandler,
);
router.post(
  "/cancel",
  authenticate,
  authorize(Role.CITIZEN),
  cancelSubscriptionHandler,
);
router.get("/subscription", authenticate, getMySubscriptionHandler);
router.get("/checkout-success", checkoutSuccessHandler);
router.get("/checkout-cancel", checkoutCancelHandler);
router.get("/:id", authenticate, getPaymentByIdHandler);

export default router;
