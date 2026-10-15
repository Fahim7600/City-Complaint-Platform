import { prisma } from "../config/prisma";

/**
 * Hourly cleanup job to prune password reset code records older than 24 hours.
 */
export const cleanExpiredPasswordResetCodes = async (): Promise<{
  count: number;
}> => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.passwordResetCode.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });
  return result;
};
