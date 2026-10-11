import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { config } from "../config/env";

const shouldSkip = (_req: Request): boolean => {
  return config.NODE_ENV === "test" || config.RATE_LIMIT_DISABLED;
};

const isHealthCheck = (req: Request): boolean => {
  const urlPath = (req.originalUrl || req.url || "").split("?")[0];
  return (
    urlPath === "/api/v1/health" ||
    req.path === "/api/v1/health" ||
    req.path === "/health"
  );
};

const rateLimitResponse = {
  success: false,
  message: "Too many requests, please try again later.",
};

const commonRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: rateLimitResponse,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitResponse);
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
};

export const globalLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  skip: (req) => shouldSkip(req) || isHealthCheck(req),
});

export const authLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: shouldSkip,
});

export const refreshLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: shouldSkip,
});

export const checkoutLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: shouldSkip,
});
