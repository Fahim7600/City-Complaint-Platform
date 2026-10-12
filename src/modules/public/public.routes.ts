import { Router } from "express";
import {
  getDepartmentTechniciansController,
  getPublicCategoriesController,
  getPublicDepartmentsController,
  getPublicOverviewController,
  getPublicPremiumInfoController,
  getPublicStatsController,
} from "./public.controller";

const router = Router();

/** @swagger
 * /public/departments:
 *   get:
 *     summary: List active municipal departments
 *     tags: [Public]
 *     responses: {200: {description: Active departments}}
 */
router.get("/departments", getPublicDepartmentsController);

/** @swagger
 * /public/departments/{id}/technicians:
 *   get:
 *     summary: List active technicians for a department with ratings
 *     tags: [Public]
 *     parameters: [{in: path, name: id, required: true, schema: {type: string, format: uuid}}]
 *     responses: {200: {description: Department technicians with ratings}, 404: {description: Department not found}}
 */
router.get("/departments/:id/technicians", getDepartmentTechniciansController);

/** @swagger
 * /public/categories:
 *   get:
 *     summary: List active service categories
 *     tags: [Public]
 *     responses: {200: {description: Active categories}}
 */
router.get("/categories", getPublicCategoriesController);

/** @swagger
 * /public/stats:
 *   get:
 *     summary: Get public complaint resolution statistics
 *     tags: [Public]
 *     responses: {200: {description: Platform statistics}}
 */
router.get("/stats", getPublicStatsController);

/** @swagger
 * /public/premium-info:
 *   get:
 *     summary: Get citizen premium subscription benefits and current pricing
 *     tags: [Public]
 *     responses: {200: {description: Premium tier benefits and Stripe price info}}
 */
router.get("/premium-info", getPublicPremiumInfoController);

/** @swagger
 * /public/overview:
 *   get:
 *     summary: Get complete public landing page overview content and statistics
 *     tags: [Public]
 *     responses: {200: {description: Landing page content, FAQs, plans, departments, categories, and live statistics}}
 */
router.get("/overview", getPublicOverviewController);

export default router;
