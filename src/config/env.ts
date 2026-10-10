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

const jwtAccessSecret =
  process.env.JWT_ACCESS_SECRET || "default_access_secret_key";
const jwtRefreshSecret =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret_key";
const jwtAccessExpiry = process.env.JWT_ACCESS_EXPIRY || "15m";
const jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRY || "7d";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";

const cloudinaryCloudName = getRequiredEnvVar("CLOUDINARY_CLOUD_NAME");
const cloudinaryApiKey = getRequiredEnvVar("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = getRequiredEnvVar("CLOUDINARY_API_SECRET");
const stripeSecretKey = getRequiredEnvVar("STRIPE_SECRET_KEY");
const stripeWebhookSecret = getRequiredEnvVar("STRIPE_WEBHOOK_SECRET");
const stripePremiumPriceId = getRequiredEnvVar("STRIPE_PREMIUM_PRICE_ID");
const appBaseUrl = getRequiredEnvVar("APP_BASE_URL");
const frontendBaseUrl = process.env.FRONTEND_BASE_URL?.trim() || "";

export const config = {
  PORT: port,
  DATABASE_URL: databaseUrl,
  NODE_ENV: nodeEnv,
  ALLOWED_ORIGINS: allowedOrigins,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_ACCESS_EXPIRY: jwtAccessExpiry,
  JWT_REFRESH_EXPIRY: jwtRefreshExpiry,
  GOOGLE_CLIENT_ID: googleClientId,
  CLOUDINARY_CLOUD_NAME: cloudinaryCloudName,
  CLOUDINARY_API_KEY: cloudinaryApiKey,
  CLOUDINARY_API_SECRET: cloudinaryApiSecret,
  STRIPE_SECRET_KEY: stripeSecretKey,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
  STRIPE_PREMIUM_PRICE_ID: stripePremiumPriceId,
  APP_BASE_URL: appBaseUrl,
  FRONTEND_BASE_URL: frontendBaseUrl,
};
