import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { webhookHandler } from "./modules/payments/payment.controller";
import apiRoutes from "./routes";
import { successResponse } from "./utils/response";

const app = express();

app.set("trust proxy", 1);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        config.ALLOWED_ORIGINS.includes("*") ||
        config.ALLOWED_ORIGINS.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);

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

// Body parsing middleware
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

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
