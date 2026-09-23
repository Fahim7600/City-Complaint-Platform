import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  listMyNotificationsController,
  markAllAsReadController,
  markAsReadController,
} from "./notification.controller";

const router = Router();

router.use(authenticate);
/** @swagger
 * /notifications/:
 *   get:
 *     summary: List the authenticated user's notifications
 *     tags: [Notifications]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: query, name: page, schema: {type: integer, default: 1}}, {in: query, name: limit, schema: {type: integer, maximum: 50, default: 10}}, {in: query, name: unreadOnly, schema: {type: boolean, default: false}}]
 *     responses: {200: {description: Notifications}, 401: {description: Unauthorized}}
 */
router.get("/", listMyNotificationsController);
/** @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{bearerAuth: []}]
 *     responses: {200: {description: Updated count}, 401: {description: Unauthorized}}
 */
router.patch("/read-all", markAllAsReadController);
/** @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
 *     security: [{bearerAuth: []}]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Notification}, 401: {description: Unauthorized}, 404: {description: Not found}}
 */
router.patch("/:id/read", markAsReadController);

export default router;
