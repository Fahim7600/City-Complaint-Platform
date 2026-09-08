import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[Config Error] Missing required environment variable: ${key}`,
    );
  }
  return value.trim();
};

const databaseUrl = getRequiredEnvVar("DATABASE_URL");
const portStr = process.env.PORT || "3000";
const port = Number.parseInt(portStr, 10);
if (Number.isNaN(port)) {
  throw new Error(
    `[Config Error] Invalid PORT environment variable: ${portStr}`,
  );
}

const nodeEnv = process.env.NODE_ENV || "development";
const allowedOriginsStr = process.env.ALLOWED_ORIGINS || "*";
const allowedOrigins = allowedOriginsStr
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  PORT: port,
  DATABASE_URL: databaseUrl,
  NODE_ENV: nodeEnv,
  ALLOWED_ORIGINS: allowedOrigins,
};
