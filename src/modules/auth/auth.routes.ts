import { Router } from "express";
import {
  authLimiter,
  refreshLimiter,
  resetLimiter,
  verifyResetLimiter,
} from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate";
import {
  forgotPasswordHandler,
  googleAuthHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
  resetPasswordHandler,
  verifyResetCodeHandler,
} from "./auth.controller";
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from "./auth.validation";

const router = Router();

/** @swagger
 * /auth/register:
 *   post:
 *     summary: Register a citizen account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: {type: string}
 *               email: {type: string, format: email}
 *               password: {type: string}
 *               staffApplication: {type: object}
 *     responses: {201: {description: Registered}, 400: {description: Validation failure}}
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  registerHandler,
);
/** @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content: {application/json: {schema: {type: object, required: [email, password], properties: {email: {type: string}, password: {type: string}}}}}
 *     responses: {200: {description: Login successful}, 400: {description: Validation failure}, 401: {description: Invalid credentials}}
 */
router.post("/login", authLimiter, validate(loginSchema), loginHandler);
/** @swagger
 * /auth/google:
 *   post:
 *     summary: Authenticate with Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content: {application/json: {schema: {type: object, required: [idToken], properties: {idToken: {type: string}}}}}
 *     responses: {200: {description: Login successful}, 400: {description: Invalid token}}
 */
router.post(
  "/google",
  authLimiter,
  validate(googleAuthSchema),
  googleAuthHandler,
);
/** @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh an access token
 *     tags: [Auth]
 *     responses: {200: {description: Token refreshed}, 401: {description: Invalid refresh token}}
 */
router.post("/refresh-token", refreshLimiter, refreshTokenHandler);
/** @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and revoke the refresh token
 *     tags: [Auth]
 *     responses: {200: {description: Logged out}}
 */
router.post("/logout", logoutHandler);

/** @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a 6-digit password reset code by email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: {type: string, format: email}
 *     responses:
 *       200: {description: Reset code sent if account exists}
 *       400: {description: Validation failure}
 *       429: {description: Too many requests}
 */
router.post(
  "/forgot-password",
  resetLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordHandler,
);

/** @swagger
 * /auth/verify-reset-code:
 *   post:
 *     summary: Verify 6-digit password reset code and receive a reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: {type: string, format: email}
 *               code: {type: string, minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$'}
 *     responses:
 *       200: {description: Code verified successfully; reset token issued}
 *       400: {description: Invalid or expired code, or too many attempts}
 *       429: {description: Too many requests}
 */
router.post(
  "/verify-reset-code",
  verifyResetLimiter,
  validate(verifyResetCodeSchema),
  verifyResetCodeHandler,
);

/** @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset account password using verified reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword]
 *             properties:
 *               resetToken: {type: string}
 *               newPassword: {type: string, minLength: 8}
 *     responses:
 *       200: {description: Password updated successfully}
 *       400: {description: Reset link expired or validation failure}
 *       429: {description: Too many requests}
 */
router.post(
  "/reset-password",
  verifyResetLimiter,
  validate(resetPasswordSchema),
  resetPasswordHandler,
);

export default router;
