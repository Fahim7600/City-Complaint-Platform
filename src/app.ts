import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { webhookHandler } from "./modules/payments/payment.controller";
import apiRoutes from "./routes";

const app = express();

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

// Mount API routes under /api/v1
app.use("/api/v1", apiRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

export default app;
