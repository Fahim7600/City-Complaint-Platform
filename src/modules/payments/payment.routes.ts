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

/** @swagger
 * /payments/checkout-session:
 *   post:
 *     summary: Create a Stripe Checkout subscription session
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Checkout URL}, 400: {description: Already subscribed}, 401: {description: Unauthorized}, 403: {description: Citizen access required}}
 */
router.post(
  "/checkout-session",
  authenticate,
  authorize(Role.CITIZEN),
  createCheckoutSessionHandler,
);
/** @swagger
 * /payments/cancel:
 *   post:
 *     summary: Schedule subscription cancellation at period end
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Cancellation scheduled}, 401: {description: Unauthorized}, 404: {description: Active subscription not found}}
 */
router.post(
  "/cancel",
  authenticate,
  authorize(Role.CITIZEN),
  cancelSubscriptionHandler,
);
/** @swagger
 * /payments/subscription:
 *   get:
 *     summary: Get the authenticated subscription
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Subscription}, 401: {description: Unauthorized}}
 */
router.get("/subscription", authenticate, getMySubscriptionHandler);
/** @swagger
 * /payments/checkout-success:
 *   get:
 *     summary: Stripe Checkout success placeholder
 *     tags: [Payments]
 *     responses: {200: {description: Payment successful}}
 */
router.get("/checkout-success", checkoutSuccessHandler);
/** @swagger
 * /payments/checkout-cancel:
 *   get:
 *     summary: Stripe Checkout cancellation placeholder
 *     tags: [Payments]
 *     responses: {200: {description: Checkout cancelled}}
 */
router.get("/checkout-cancel", checkoutCancelHandler);
/** @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get a payment by ID
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Payment}, 401: {description: Unauthorized}, 403: {description: Forbidden}, 404: {description: Not found}}
 */
router.get("/:id", authenticate, getPaymentByIdHandler);

export default router;
