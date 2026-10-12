import app from "./app";
import { config } from "./config/env";
import { prisma } from "./config/prisma";
import { startScheduledJobs } from "./jobs/scheduler";

const server = app.listen(config.PORT, "0.0.0.0", () => {
  console.log(
    `[Server] Running in ${config.NODE_ENV} mode on port ${config.PORT}`,
  );
  console.log(`[Server] Local URL:     http://localhost:${config.PORT}`);
  console.log(
    `[Server] Swagger Docs:  http://localhost:${config.PORT}/api-docs`,
  );
  console.log(
    `[Server] Health Check:  http://localhost:${config.PORT}/api/v1/health`,
  );
  startScheduledJobs();
});

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Server] Received ${signal}, starting graceful shutdown`);

  const forceTimeout = setTimeout(() => {
    console.error(
      "[Server] Graceful shutdown timed out after 10s, forcing exit",
    );
    process.exit(1);
  }, 10_000);
  forceTimeout.unref();

  server.close(async (err) => {
    if (err) {
      console.error("[Server] Error closing HTTP server", err);
    }
    try {
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      console.error("[Server] Error disconnecting database", error);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[Unhandled Rejection]", reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("[Uncaught Exception]", error);
  process.exit(1);
});

export default server;
