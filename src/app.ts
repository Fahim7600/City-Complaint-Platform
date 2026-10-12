import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { type CustomError, errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { globalLimiter } from "./middlewares/rateLimit.middleware";
import { webhookHandler } from "./modules/payments/payment.controller";
import apiRoutes from "./routes";
import { successResponse } from "./utils/response";

const app = express();

if (config.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (config.ALLOWED_ORIGINS.includes("*")) {
        if (config.NODE_ENV === "production") {
          console.warn(
            "[CORS Warning] Wildcard '*' allowed origin in production is insecure",
          );
        }
        callback(null, true);
        return;
      }
      if (config.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      const corsError: CustomError = new Error("Origin not allowed by CORS");
      corsError.statusCode = 403;
      corsError.stack = undefined;
      callback(corsError);
    },
    credentials: true,
  }),
);

// Request logging middleware
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

/** @swagger
 * /payments/webhook:
 *   post:
 *     summary: Receive a Stripe webhook event
 *     tags: [Payments]
 *     requestBody: {required: true, content: {application/json: {schema: {type: object}}}}
 *     responses: {200: {description: Webhook acknowledged}, 400: {description: Invalid signature}, 500: {description: Processing failure}}
 */
// Stripe must receive the unparsed body for signature verification.
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler,
);

// Global rate limiter applied after the Stripe webhook route
app.use(globalLimiter);

// Body parsing middleware
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.status(200).json(
    successResponse("City Complaint & Service Request Platform API", {
      health: "/api/v1/health",
      documentation: "/api-docs",
    }),
  );
});

// Mount API routes under /api/v1
app.use("/api/v1", apiRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

export default app;
