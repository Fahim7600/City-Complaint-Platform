import cron from "node-cron";
import { checkOverdueSlas } from "./checkOverdueSla.job";

export const startScheduledJobs = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      await checkOverdueSlas();
    } catch (error) {
      console.error("[Scheduler] Overdue SLA check failed", error);
    }
  });
};
