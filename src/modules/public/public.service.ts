import { ComplaintStatus, Role } from "@prisma/client";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import { stripe } from "../../config/stripe";
import { AppError } from "../auth/auth.service";
import {
  CALLS_TO_ACTION,
  FAQS,
  FREE_BENEFITS,
  PLAN_COMPARISON,
  PLATFORM_HIGHLIGHTS,
  PLATFORM_INFO,
  PREMIUM_BENEFITS,
  ROLES_INFO,
  getHowItWorksSteps,
} from "./public.content";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export const getCached = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setCached = <T>(
  key: string,
  data: T,
  ttlMs = 5 * 60 * 1000,
): void => {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
};

export const getPublicDepartments = async () => {
  const cacheKey = "public_departments";
  const cached =
    getCached<Array<{ id: string; name: string; description: string | null }>>(
      cacheKey,
    );
  if (cached) return cached;

  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  setCached(cacheKey, departments);
  return departments;
};

export const getDepartmentTechnicians = async (departmentId: string) => {
  const department = await prisma.department.findFirst({
    where: { id: departmentId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  const technicians = await prisma.user.findMany({
    where: {
      departmentId,
      role: Role.TECHNICIAN,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      isAvailable: true,
      reviewsReceived: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return technicians.map((tech) => {
    const reviewCount = tech.reviewsReceived.length;
    const sumRatings = tech.reviewsReceived.reduce(
      (acc, r) => acc + r.rating,
      0,
    );
    const averageRating =
      reviewCount > 0 ? Number((sumRatings / reviewCount).toFixed(2)) : 0;

    return {
      id: tech.id,
      name: tech.name,
      avatarUrl: tech.avatarUrl,
      isAvailable: tech.isAvailable,
      averageRating,
      reviewCount,
    };
  });
};

export const getPublicCategories = async () => {
  const cacheKey = "public_categories";
  const cached =
    getCached<
      Array<{
        id: string;
        name: string;
        departmentId: string;
        slaHours: number;
      }>
    >(cacheKey);
  if (cached) return cached;

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      departmentId: true,
      slaHours: true,
    },
    orderBy: { name: "asc" },
  });

  setCached(cacheKey, categories);
  return categories;
};

export const getPublicStats = async () => {
  const cacheKey = "public_stats";
  const cached = getCached<{
    totalComplaints: number;
    resolvedCount: number;
    resolutionRate: number;
    averageResolutionHours: number;
    countsByStatus: Record<string, number>;
  }>(cacheKey);
  if (cached) return cached;

  const [statusGroups, resolvedComplaints] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.complaint.findMany({
      where: {
        deletedAt: null,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    }),
  ]);

  const countsByStatus: Record<string, number> = {
    PENDING: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };

  let totalComplaints = 0;
  for (const group of statusGroups) {
    countsByStatus[group.status] = group._count;
    totalComplaints += group._count;
  }

  const resolvedCount =
    (countsByStatus.RESOLVED || 0) + (countsByStatus.CLOSED || 0);
  const resolutionRate =
    totalComplaints > 0
      ? Number(((resolvedCount / totalComplaints) * 100).toFixed(2))
      : 0;

  let averageResolutionHours = 0;
  if (resolvedComplaints.length > 0) {
    const totalHours = resolvedComplaints.reduce((acc, c) => {
      const diffMs = (c.resolvedAt?.getTime() ?? 0) - c.createdAt.getTime();
      return acc + Math.max(0, diffMs / (1000 * 60 * 60));
    }, 0);
    averageResolutionHours = Number(
      (totalHours / resolvedComplaints.length).toFixed(2),
    );
  }

  const stats = {
    totalComplaints,
    resolvedCount,
    resolutionRate,
    averageResolutionHours,
    countsByStatus,
  };

  setCached(cacheKey, stats);
  return stats;
};

export const getCachedStripePrice = async (): Promise<{
  amount: number;
  currency: string;
  interval: string | null;
} | null> => {
  if (
    !config.STRIPE_PREMIUM_PRICE_ID ||
    config.STRIPE_PREMIUM_PRICE_ID.trim() === ""
  ) {
    return null;
  }

  try {
    const stripePrice = await stripe.prices.retrieve(
      config.STRIPE_PREMIUM_PRICE_ID,
    );
    return {
      amount: (stripePrice.unit_amount || 0) / 100,
      currency: stripePrice.currency,
      interval: stripePrice.recurring?.interval || null,
    };
  } catch (err) {
    console.warn(
      "[Public Service] Could not retrieve Stripe price for premium info, returning price: null",
      err,
    );
    return null;
  }
};

export const getPublicPremiumInfo = async () => {
  const cacheKey = "public_premium_info";
  const cached = getCached<{
    benefits: string[];
    price: {
      amount: number;
      currency: string;
      interval: string | null;
    } | null;
  }>(cacheKey);
  if (cached) return cached;

  const price = await getCachedStripePrice();

  const result = {
    benefits: PREMIUM_BENEFITS,
    price,
  };

  setCached(cacheKey, result);
  return result;
};

export const getPublicOverview = async () => {
  const cacheKey = "public_overview";
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const [departmentsResult, categoriesResult, statsResult, stripePrice] =
    await Promise.allSettled([
      getPublicDepartments(),
      getPublicCategories(),
      getPublicStats(),
      getCachedStripePrice(),
    ]);

  const departments =
    departmentsResult.status === "fulfilled"
      ? departmentsResult.value.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
        }))
      : [];

  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.map((c) => ({
          id: c.id,
          name: c.name,
          departmentId: c.departmentId,
          slaHours: c.slaHours,
        }))
      : [];

  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;

  const price = stripePrice.status === "fulfilled" ? stripePrice.value : null;

  const overview = {
    platform: PLATFORM_INFO,
    highlights: PLATFORM_HIGHLIGHTS,
    howItWorks: getHowItWorksSteps(),
    roles: ROLES_INFO,
    plans: {
      free: {
        monthlyComplaintLimit: config.MONTHLY_COMPLAINT_LIMIT_FREE,
        priority: "Standard",
        price: 0,
        benefits: FREE_BENEFITS,
      },
      premium: {
        monthlyComplaintLimit: config.MONTHLY_COMPLAINT_LIMIT_PREMIUM,
        priority: "HIGH on every new complaint",
        price,
        benefits: PREMIUM_BENEFITS,
      },
      comparison: PLAN_COMPARISON,
    },
    faqs: FAQS,
    callsToAction: CALLS_TO_ACTION,
    stats,
    departments,
    categories,
  };

  setCached(cacheKey, overview);
  return overview;
};
