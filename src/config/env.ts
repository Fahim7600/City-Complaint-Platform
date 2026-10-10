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

const appBaseUrl = getRequiredEnvVar("APP_BASE_URL");
const frontendBaseUrl = process.env.FRONTEND_BASE_URL?.trim() || "";

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
let allowedOrigins: string[];

if (rawAllowedOrigins !== undefined && rawAllowedOrigins.trim() !== "") {
  allowedOrigins = rawAllowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
} else if (nodeEnv === "production") {
  allowedOrigins = [];
} else {
  allowedOrigins = ["*"];
}

const addOriginToList = (list: string[], urlStr?: string) => {
  if (!urlStr || urlStr.trim() === "") return;
  try {
    const origin = new URL(urlStr.trim()).origin;
    if (!list.includes(origin)) {
      list.push(origin);
    }
  } catch (_err) {
    console.warn(
      `[Config Warning] Invalid URL provided for origin extraction: ${urlStr}`,
    );
  }
};

addOriginToList(allowedOrigins, appBaseUrl);
addOriginToList(allowedOrigins, frontendBaseUrl);

let jwtAccessSecret = process.env.JWT_ACCESS_SECRET?.trim();
let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET?.trim();

if (nodeEnv === "production") {
  if (!jwtAccessSecret) {
    throw new Error(
      "[Config Error] Missing required environment variable: JWT_ACCESS_SECRET",
    );
  }
  if (jwtAccessSecret.length < 32) {
    throw new Error(
      "[Config Error] JWT_ACCESS_SECRET must be at least 32 characters in production",
    );
  }
  if (!jwtRefreshSecret) {
    throw new Error(
      "[Config Error] Missing required environment variable: JWT_REFRESH_SECRET",
    );
  }
  if (jwtRefreshSecret.length < 32) {
    throw new Error(
      "[Config Error] JWT_REFRESH_SECRET must be at least 32 characters in production",
    );
  }
  if (jwtAccessSecret === jwtRefreshSecret) {
    throw new Error(
      "[Config Error] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    );
  }
} else {
  if (!jwtAccessSecret || !jwtRefreshSecret) {
    console.warn(
      "[Config Warning] Default JWT secrets are in use. Set strong secrets for production.",
    );
  }
  jwtAccessSecret = jwtAccessSecret || "default_access_secret_key";
  jwtRefreshSecret = jwtRefreshSecret || "default_refresh_secret_key";
}

const jwtAccessExpiry = process.env.JWT_ACCESS_EXPIRY || "15m";
const jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRY || "7d";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";

const cloudinaryCloudName = getRequiredEnvVar("CLOUDINARY_CLOUD_NAME");
const cloudinaryApiKey = getRequiredEnvVar("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = getRequiredEnvVar("CLOUDINARY_API_SECRET");
const stripeSecretKey = getRequiredEnvVar("STRIPE_SECRET_KEY");
const stripeWebhookSecret = getRequiredEnvVar("STRIPE_WEBHOOK_SECRET");
const stripePremiumPriceId = getRequiredEnvVar("STRIPE_PREMIUM_PRICE_ID");

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
