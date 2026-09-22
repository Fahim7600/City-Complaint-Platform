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

router.post("/register", validate(registerSchema), registerHandler);
router.post("/login", validate(loginSchema), loginHandler);
router.post("/google", validate(googleAuthSchema), googleAuthHandler);
router.post("/refresh-token", refreshTokenHandler);
router.post("/logout", logoutHandler);

export default router;
