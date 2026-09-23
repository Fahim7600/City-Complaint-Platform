import app from "./app";
import { config } from "./config/env";
import { startScheduledJobs } from "./jobs/scheduler";

const server = app.listen(config.PORT, () => {
  console.log(
    `[Server] Running in ${config.NODE_ENV} mode on http://localhost:${config.PORT}`,
  );
  startScheduledJobs();
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[Unhandled Rejection]", reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("[Uncaught Exception]", error);
  process.exit(1);
});

export default server;
