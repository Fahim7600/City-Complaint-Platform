import {
  ApprovalStatus,
  ComplaintStatus,
  PaymentStatus,
  type Prisma,
  Role,
} from "@prisma/client";
import type Stripe from "stripe";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import { stripe } from "../../config/stripe";
import { sanitizeUser } from "../../utils/sanitizeUser";
import { AppError } from "../auth/auth.service";
import type {
  AuditLogQuery,
  ListPaymentsQuery,
  ListUsersQuery,
  OverrideRoleInput,
} from "./admin.validation";

interface AdminUser {
  userId: string;
  role: string;
}

export const listUsers = async (query: ListUsersQuery) => {
  const where: Prisma.UserWhereInput = {};
  if (!query.includeDeleted) where.deletedAt = null;
  if (query.role) where.role = query.role;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.user.count({ where });
  const items = await prisma.user.findMany({
    where,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      approvalStatus: true,
      requestedRole: true,
      phone: true,
      isPremium: true,
      isAvailable: true,
      deletedAt: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
};

export const overrideUserRoleAndDepartment = async (
  adminUser: AdminUser,
  targetUserId: string,
  data: OverrideRoleInput,
) => {
  if (targetUserId === adminUser.userId) {
    throw new AppError(
      "You cannot change your own role through this endpoint",
      403,
    );
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  });
  if (!target) throw new AppError("User not found", 404);
  if ((data.role as string) === "ADMIN") {
    throw new AppError("This endpoint cannot grant ADMIN", 400);
  }

  if (data.role === "TECHNICIAN" || data.role === "MANAGER") {
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, deletedAt: null },
    });
    if (!department) throw new AppError("Department not found", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      role: data.role as Role,
      departmentId: data.role === "CITIZEN" ? null : data.departmentId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminUser.userId,
      action: "USER_ROLE_OVERRIDDEN",
      entityType: "User",
      entityId: targetUserId,
      metadata: {
        previousRole: target.role,
        newRole: data.role,
        departmentId: data.departmentId ?? null,
      },
    },
  });

  return sanitizeUser(updatedUser);
};

export const deactivateUser = async (
  adminUser: AdminUser,
  targetUserId: string,
) => {
  if (targetUserId === adminUser.userId) {
    throw new AppError("You cannot deactivate your own account", 403);
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  });
  if (!target) throw new AppError("User not found", 404);

  if (target.role === Role.ADMIN) {
    const otherAdminCount = await prisma.user.count({
      where: {
        role: Role.ADMIN,
        deletedAt: null,
        id: { not: targetUserId },
      },
    });
    if (otherAdminCount === 0) {
      throw new AppError("Cannot deactivate the last remaining admin", 400);
    }
  }

  const deletedAt = new Date();
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { deletedAt },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: deletedAt },
    }),
    prisma.auditLog.create({
      data: {
        actorId: adminUser.userId,
        action: "USER_DEACTIVATED",
        entityType: "User",
        entityId: targetUserId,
      },
    }),
  ]);

  return sanitizeUser(updatedUser);
};

export const reactivateUser = async (
  adminUser: AdminUser,
  targetUserId: string,
) => {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new AppError("User not found", 404);
  if (target.deletedAt === null) {
    throw new AppError("User is not deactivated", 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { deletedAt: null },
  });
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.userId,
      action: "USER_REACTIVATED",
      entityType: "User",
      entityId: targetUserId,
    },
  });

  return sanitizeUser(updatedUser);
};

export const getDashboardStats = async () => {
  const [
    usersByRole,
    deactivatedUserCount,
    complaintsByStatus,
    overdueComplaintCount,
    totalRevenue,
    complaintsByDepartmentAndStatus,
    techniciansByDepartment,
    departments,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.complaint.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.complaint.count({
      where: {
        deletedAt: null,
        slaDueAt: { lt: new Date() },
        status: {
          notIn: [
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.CANCELLED,
            ComplaintStatus.REJECTED,
          ],
        },
      },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCEEDED },
      _sum: { amount: true },
    }),
    prisma.complaint.groupBy({
      by: ["departmentId", "status"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.user.groupBy({
      by: ["departmentId"],
      where: { role: Role.TECHNICIAN, deletedAt: null },
      _count: true,
    }),
    prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  const overdueStatuses = new Set<ComplaintStatus>([
    ComplaintStatus.PENDING,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.IN_PROGRESS,
  ]);
  const departmentOverdueCounts = await Promise.all(
    departments.map(async (department) => ({
      departmentId: department.id,
      count: await prisma.complaint.count({
        where: {
          departmentId: department.id,
          deletedAt: null,
          slaDueAt: { lt: new Date() },
          status: { in: [...overdueStatuses] },
        },
      }),
    })),
  );
  const overdueByDepartment = new Map(
    departmentOverdueCounts.map((item) => [item.departmentId, item.count]),
  );
  const techniciansByDepartmentMap = new Map(
    techniciansByDepartment.map((item) => [item.departmentId, item._count]),
  );

  const departmentBreakdown = departments.map((department) => {
    const statusGroups = complaintsByDepartmentAndStatus.filter(
      (item) => item.departmentId === department.id,
    );
    const complaintsByStatus = Object.fromEntries(
      statusGroups.map((item) => [item.status, item._count]),
    );
    return {
      departmentId: department.id,
      departmentName: department.name,
      technicianCount: techniciansByDepartmentMap.get(department.id) ?? 0,
      complaintsByStatus,
      totalComplaints: statusGroups.reduce(
        (total, item) => total + item._count,
        0,
      ),
      overdueCount: overdueByDepartment.get(department.id) ?? 0,
    };
  });

  return {
    users: { byRole: usersByRole, deactivated: deactivatedUserCount },
    complaints: {
      byStatus: complaintsByStatus,
      overdue: overdueComplaintCount,
    },
    revenue: { totalCents: totalRevenue._sum.amount ?? 0 },
    departments: departmentBreakdown,
  };
};

export const listAuditLogs = async (query: AuditLogQuery) => {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.actorId) where.actorId = query.actorId;
  if (query.action) where.action = query.action;
  if (query.entityType) where.entityType = query.entityType;
  if (query.entityId) where.entityId = query.entityId;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  const total = await prisma.auditLog.count({ where });
  const items = await prisma.auditLog.findMany({
    where,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
};

export const listSubscriptions = async (query: ListPaymentsQuery) => {
  const where: Prisma.SubscriptionWhereInput = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.userId) {
    where.userId = query.userId;
  }

  const total = await prisma.subscription.count({ where });
  const subscriptions = await prisma.subscription.findMany({
    where,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const formattedSubscriptions = subscriptions.map((sub) => ({
    id: sub.id,
    user: {
      id: sub.user.id,
      name: sub.user.name,
      email: sub.user.email,
    },
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    payments: sub.user.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paidAt: p.createdAt,
    })),
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  }));

  return {
    subscriptions: formattedSubscriptions,
    items: formattedSubscriptions,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
};

export const getAdminPremiumPricing = async () => {
  if (
    !config.STRIPE_PREMIUM_PRICE_ID ||
    config.STRIPE_PREMIUM_PRICE_ID.trim() === ""
  ) {
    throw new AppError("Stripe premium price ID is not configured", 502);
  }

  try {
    const stripePrice = await stripe.prices.retrieve(
      config.STRIPE_PREMIUM_PRICE_ID,
      {
        expand: ["product"],
      },
    );

    let productName = "Premium Subscription";
    if (
      stripePrice.product &&
      typeof stripePrice.product === "object" &&
      !("deleted" in stripePrice.product && stripePrice.product.deleted)
    ) {
      productName = (stripePrice.product as Stripe.Product).name;
    }

    return {
      priceId: stripePrice.id,
      productName,
      amount: (stripePrice.unit_amount || 0) / 100,
      currency: stripePrice.currency,
      interval: stripePrice.recurring?.interval || null,
      active: stripePrice.active,
    };
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to retrieve price from Stripe";
    const sanitizedMessage = config.STRIPE_SECRET_KEY
      ? rawMessage.replaceAll(config.STRIPE_SECRET_KEY, "[REDACTED]")
      : rawMessage;
    throw new AppError(
      `Failed to retrieve premium pricing from Stripe: ${sanitizedMessage}`,
      502,
    );
  }
};
