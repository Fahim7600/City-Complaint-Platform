import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";

export const createNotification = async (params: {
  userId: string;
  type: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) => {
  try {
    return await prisma.notification.create({ data: params });
  } catch (error) {
    console.error("[Notification] Failed to create notification", error);
    return null;
  }
};

export const listMyNotifications = async (
  userId: string,
  query: { page: number; limit: number; unreadOnly: boolean },
) => {
  const where = {
    userId,
    ...(query.unreadOnly ? { isRead: false } : {}),
  };
  const total = await prisma.notification.count({ where });
  const items = await prisma.notification.findMany({
    where,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    orderBy: { createdAt: "desc" },
  });

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new AppError("Notification not found", 404);

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { count: result.count };
};
