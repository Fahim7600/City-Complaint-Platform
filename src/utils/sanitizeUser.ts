import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export const sanitizeUser = <T extends Record<string, unknown>>(
  user: T,
): Omit<T, "passwordHash" | "refreshTokens"> => {
  const { passwordHash, refreshTokens, ...safeUser } = user;
  return safeUser;
};
