import type { CookieOptions, Response } from "express";
import { config } from "../../config/env";

export const REFRESH_COOKIE_NAME = "refreshToken";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

const DEFAULT_REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const refreshCookieOptions = (
  maxAge: number = DEFAULT_REFRESH_COOKIE_MAX_AGE_MS,
): CookieOptions => {
  const isProd = config.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge,
  };
};

export const clearRefreshCookie = (res: Response): void => {
  const isProd = config.NODE_ENV === "production";
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
    path: REFRESH_COOKIE_PATH,
  });
};
