import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../../utils/response";
import { AppError } from "../auth/auth.service";
import {
  cancelSubscription,
  createCheckoutSession,
  getMySubscription,
  getPaymentById,
  handleWebhookEvent,
  syncCheckoutSession,
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

export const checkoutSuccessHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const sessionId = req.query.session_id;
  const csRegex = /^cs_(test|live)_[A-Za-z0-9_]+$/;

  if (typeof sessionId === "string" && csRegex.test(sessionId)) {
    try {
      const result = await syncCheckoutSession(sessionId);
      res
        .status(200)
        .json(
          successResponse("Payment successful, you can close this tab", result),
        );
      return;
    } catch (error) {
      console.error(
        "[Stripe] Failed to sync checkout session on success return",
        error,
      );
      res.status(200).json(
        successResponse("Payment successful, you can close this tab", {
          synced: false,
        }),
      );
      return;
    }
  }

  res
    .status(200)
    .json(successResponse("Payment successful, you can close this tab"));
};

export const confirmSessionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const result = await syncCheckoutSession(
      req.body.sessionId,
      req.user.userId,
    );
    res.status(200).json(successResponse("Payment status checked", result));
  } catch (error) {
    next(error);
  }
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
