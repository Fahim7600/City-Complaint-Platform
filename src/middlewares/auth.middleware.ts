import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { prisma } from "../config/prisma";
import { errorResponse } from "../utils/response";

export interface JwtAccessPayload {
  userId: string;
  role: Role;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json(errorResponse("Authentication token required"));
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      config.JWT_ACCESS_SECRET,
    ) as JwtAccessPayload;

    void prisma.user
      .findUnique({
        where: { id: decoded.userId },
        select: { role: true, deletedAt: true },
      })
      .then((user) => {
        if (!user || user.deletedAt) {
          res.status(401).json(errorResponse("User account is unavailable"));
          return;
        }

        req.user = {
          userId: decoded.userId,
          role: user.role,
        };
        next();
      })
      .catch(() => {
        res.status(401).json(errorResponse("Unable to verify user account"));
      });
  } catch (_err) {
    res
      .status(401)
      .json(errorResponse("Invalid or expired authentication token"));
    return;
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json(errorResponse("Forbidden: Insufficient permissions"));
      return;
    }

    next();
  };
};
