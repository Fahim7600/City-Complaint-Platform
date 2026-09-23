import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  listMyNotificationsController,
  markAllAsReadController,
  markAsReadController,
} from "./notification.controller";

const router = Router();

router.use(authenticate);
router.get("/", listMyNotificationsController);
router.patch("/read-all", markAllAsReadController);
router.patch("/:id/read", markAsReadController);

export default router;
