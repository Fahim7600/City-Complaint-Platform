import cron from "node-cron";
import { checkOverdueSlas } from "./checkOverdueSla.job";
import { cleanExpiredPasswordResetCodes } from "./cleanExpiredPasswordResetCodes.job";

export const startScheduledJobs = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      await checkOverdueSlas();
    } catch (error) {
      console.error("[Scheduler] Overdue SLA check failed", error);
    }

    try {
      await cleanExpiredPasswordResetCodes();
    } catch (error) {
      console.error(
        "[Scheduler] Expired password reset codes cleanup failed",
        error,
      );
    }
  });
};
