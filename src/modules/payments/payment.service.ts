import {
  PaymentPurpose,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  type User,
} from "@prisma/client";
import type Stripe from "stripe";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import { stripe } from "../../config/stripe";
import { AppError } from "../auth/auth.service";
import type { UserContext } from "../complaints/complaint.service";
import { createNotification } from "../notifications/notification.service";

const stripeId = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id;

const stripeField = <T>(value: unknown, field: string): T | undefined =>
  (value as Record<string, T> | null | undefined)?.[field];

const getUserByCustomerId = async (customerId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });
  return subscription?.user ?? null;
};

const getSubscriptionForUser = async (userId: string) =>
  prisma.subscription.findUnique({ where: { userId } });

export const createCheckoutSession = async (user: UserContext) => {
  if (user.role !== Role.CITIZEN) {
    throw new AppError("Only citizens can purchase premium subscriptions", 403);
  }

  const account = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, email: true },
  });
  if (!account) throw new AppError("User not found", 404);

  let subscription = await getSubscriptionForUser(account.id);
  if (
    subscription?.status === SubscriptionStatus.ACTIVE &&
    !subscription.cancelAtPeriodEnd
  ) {
    throw new AppError("You already have an active subscription", 400);
  }

  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: account.email,
      metadata: { userId: account.id },
    });
    customerId = customer.id;
    subscription = await prisma.subscription.upsert({
      where: { userId: account.id },
      create: {
        userId: account.id,
        stripeCustomerId: customerId,
        status: SubscriptionStatus.INCOMPLETE,
      },
      update: {
        stripeCustomerId: customerId,
        status: SubscriptionStatus.INCOMPLETE,
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: config.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${config.APP_BASE_URL}/api/v1/payments/checkout-success`,
    cancel_url: `${config.APP_BASE_URL}/api/v1/payments/checkout-cancel`,
    metadata: { userId: account.id },
  });

  return session.url;
};

export const handleWebhookEvent = async (
  rawBody: Buffer,
  signature: string,
): Promise<void> => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    );
  } catch (_error) {
    throw new AppError("Invalid Stripe webhook signature", 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = stripeId(session.customer);
      const stripeSubscriptionId = stripeId(session.subscription);
      if (!customerId || !stripeSubscriptionId) {
        throw new AppError(
          "Stripe checkout session is missing subscription data",
          500,
        );
      }

      const stripeSubscription =
        await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const currentPeriodEnd = stripeField<number>(
        stripeSubscription,
        "current_period_end",
      );
      if (!currentPeriodEnd) {
        throw new AppError("Stripe subscription period is missing", 500);
      }
      const user =
        (await getUserByCustomerId(customerId)) ??
        (session.metadata?.userId
          ? await prisma.user.findUnique({
              where: { id: session.metadata.userId },
            })
          : null);
      if (!user) throw new AppError("Unable to resolve subscription user", 500);

      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeCustomerId: customerId,
          stripeSubscriptionId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(currentPeriodEnd * 1000),
          cancelAtPeriodEnd: false,
        },
        update: {
          stripeCustomerId: customerId,
          stripeSubscriptionId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(currentPeriodEnd * 1000),
          cancelAtPeriodEnd: false,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: true },
      });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "SUBSCRIPTION_STARTED",
          entityType: "Subscription",
          entityId: user.id,
        },
      });
      return;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const customerId = stripeId(invoice.customer);
      const user = customerId ? await getUserByCustomerId(customerId) : null;
      if (!user || !customerId)
        throw new AppError("Unable to resolve invoice user", 500);
      const periodEnd = invoice.lines.data[0]?.period.end;
      const paymentIntentId = stripeId(
        stripeField<string | { id: string }>(invoice, "payment_intent"),
      );
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          stripePaymentIntentId: paymentIntentId,
          status: PaymentStatus.SUCCEEDED,
          purpose: PaymentPurpose.PREMIUM_SUBSCRIPTION,
        },
      });
      await createNotification({
        userId: user.id,
        type: "PAYMENT_SUCCEEDED",
        message: "Your premium subscription payment succeeded",
        relatedEntityType: "Payment",
        relatedEntityId: paymentIntentId,
      });
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: true },
      });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "PAYMENT_SUCCEEDED",
          entityType: "Payment",
          entityId: user.id,
        },
      });
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = stripeId(invoice.customer);
      const user = customerId ? await getUserByCustomerId(customerId) : null;
      if (!user || !customerId)
        throw new AppError("Unable to resolve invoice user", 500);
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          stripePaymentIntentId: stripeId(
            stripeField<string | { id: string }>(invoice, "payment_intent"),
          ),
          status: PaymentStatus.FAILED,
          purpose: PaymentPurpose.PREMIUM_SUBSCRIPTION,
        },
      });
      await createNotification({
        userId: user.id,
        type: "PAYMENT_FAILED",
        message:
          "Your premium subscription payment failed. Please update your payment method",
        relatedEntityType: "Payment",
        relatedEntityId: stripeId(
          stripeField<string | { id: string }>(invoice, "payment_intent"),
        ),
      });
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "PAYMENT_FAILED",
          entityType: "Payment",
          entityId: user.id,
        },
      });
      return;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object;
      const customerId = stripeId(stripeSubscription.customer);
      if (!customerId)
        throw new AppError("Subscription customer is missing", 500);
      const currentPeriodEnd = stripeField<number>(
        stripeSubscription,
        "current_period_end",
      );
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: stripeSubscription.id,
          status: stripeSubscription.status as SubscriptionStatus,
          currentPeriodEnd: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000)
            : undefined,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      });
      return;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object;
      const customerId = stripeId(stripeSubscription.customer);
      if (!customerId)
        throw new AppError("Subscription customer is missing", 500);
      const localSubscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!localSubscription) throw new AppError("Subscription not found", 500);
      await prisma.subscription.update({
        where: { id: localSubscription.id },
        data: { status: SubscriptionStatus.CANCELED, cancelAtPeriodEnd: false },
      });
      await prisma.user.update({
        where: { id: localSubscription.userId },
        data: { isPremium: false },
      });
      await prisma.auditLog.create({
        data: {
          actorId: localSubscription.userId,
          action: "SUBSCRIPTION_ENDED",
          entityType: "Subscription",
          entityId: localSubscription.id,
        },
      });
      return;
    }

    default:
      return;
  }
};

export const cancelSubscription = async (user: UserContext) => {
  const subscription = await getSubscriptionForUser(user.userId);
  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new AppError("Active subscription not found", 404);
  }
  if (!subscription.stripeSubscriptionId) {
    throw new AppError("Stripe subscription is not configured", 400);
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "SUBSCRIPTION_CANCEL_REQUESTED",
      entityType: "Subscription",
      entityId: subscription.id,
    },
  });
  return {
    message:
      "Premium remains active until the end of your current billing period",
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
};

export const getMySubscription = async (user: UserContext) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.userId },
  });
  const account = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { isPremium: true },
  });
  return { subscription, isPremium: account?.isPremium ?? false };
};

export const getPaymentById = async (user: UserContext, id: string) => {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError("Payment not found", 404);
  if (user.role !== Role.ADMIN && payment.userId !== user.userId) {
    throw new AppError("Forbidden", 403);
  }
  return payment;
};

export type PaymentUser = User;
