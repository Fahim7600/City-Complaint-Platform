import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  googleAuthHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerHandler,
} from "./auth.controller";
import {
  googleAuthSchema,
  loginSchema,
  registerSchema,
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
router.post("/register", validate(registerSchema), registerHandler);
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
router.post("/login", validate(loginSchema), loginHandler);
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
router.post("/google", validate(googleAuthSchema), googleAuthHandler);
/** @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh an access token
 *     tags: [Auth]
 *     responses: {200: {description: Token refreshed}, 401: {description: Invalid refresh token}}
 */
router.post("/refresh-token", refreshTokenHandler);
/** @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and revoke the refresh token
 *     tags: [Auth]
 *     responses: {200: {description: Logged out}}
 */
router.post("/logout", logoutHandler);

export default router;
