import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  cancelSubscription,
  createCheckoutSession,
  getMySubscription,
  getPaymentById,
  handleWebhookEvent,
} from "./payment.service";

export const createCheckoutSessionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const url = await createCheckoutSession(req.user);
    res.status(200).json(successResponse("Checkout session created", { url }));
  } catch (error) {
    next(error);
  }
};

export const cancelSubscriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await cancelSubscription(req.user);
    res.status(200).json(successResponse(result.message, result));
  } catch (error) {
    next(error);
  }
};

export const getMySubscriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await getMySubscription(req.user);
    res.status(200).json(successResponse("Subscription retrieved", result));
  } catch (error) {
    next(error);
  }
};

export const getPaymentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const id = req.params.id;
    if (typeof id !== "string") throw new AppError("Invalid payment ID", 400);
    const result = await getPaymentById(req.user, id);
    res.status(200).json(successResponse("Payment retrieved", result));
  } catch (error) {
    next(error);
  }
};

export const checkoutSuccessHandler = (_req: Request, res: Response): void => {
  res
    .status(200)
    .json(successResponse("Payment successful, you can close this tab"));
};

export const checkoutCancelHandler = (_req: Request, res: Response): void => {
  res.status(200).json(successResponse("Checkout cancelled"));
};

export const webhookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      throw new AppError("Stripe signature required", 400);
    }
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError("Raw webhook body required", 400);
    }
    await handleWebhookEvent(req.body, signature);
    res.status(200).json(successResponse("Webhook received"));
  } catch (error) {
    next(error);
  }
};
