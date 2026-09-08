import { Router } from "express";
import { successResponse } from "../utils/response";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json(
    successResponse("Server is healthy", {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
});

export default router;
