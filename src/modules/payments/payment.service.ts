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

export const getPeriodEnd = (sub: Stripe.Subscription): Date | null => {
  const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end;
  if (typeof itemPeriodEnd === "number") {
    return new Date(itemPeriodEnd * 1000);
  }
  const topPeriodEnd = (sub as unknown as Record<string, unknown>)
    ?.current_period_end;
  if (typeof topPeriodEnd === "number") {
    return new Date(topPeriodEnd * 1000);
  }
  return null;
};

export const mapStripeStatus = (
  status: Stripe.Subscription.Status,
): SubscriptionStatus => {
  switch (status) {
    case "active":
    case "trialing":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "paused":
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
};

export const premiumForStatus = (status: SubscriptionStatus): boolean => {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
    case SubscriptionStatus.PAST_DUE:
      return true;
    case SubscriptionStatus.CANCELED:
    case SubscriptionStatus.INCOMPLETE:
      return false;
  }
};

const getUserByCustomerId = async (customerId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });
  return subscription?.user ?? null;
};

const getSubscriptionForUser = async (userId: string) =>
  prisma.subscription.findUnique({ where: { userId } });

export const applyStripeSubscription = async (
  stripeSubscription: Stripe.Subscription,
  userId: string,
): Promise<{ status: SubscriptionStatus; isNew: boolean }> => {
  const customerId = stripeId(stripeSubscription.customer);
  const stripeSubscriptionId = stripeSubscription.id;
  const newStatus = mapStripeStatus(stripeSubscription.status);
  const currentPeriodEnd = getPeriodEnd(stripeSubscription);
  const cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { userId },
    });

    const isNew = !(
      existing?.stripeSubscriptionId === stripeSubscriptionId &&
      existing?.status === SubscriptionStatus.ACTIVE
    );

    await tx.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId,
        status: newStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId,
        status: newStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { isPremium: premiumForStatus(newStatus) },
    });

    return { status: newStatus, isNew };
  });

  return result;
};

export const activateFromCheckoutSession = async (
  session: Stripe.Checkout.Session,
): Promise<{ activated: boolean; userId?: string }> => {
  if (session.mode !== "subscription" || session.status !== "complete") {
    return { activated: false };
  }

  const customerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) {
    throw new AppError(
      "Stripe checkout session is missing subscription data",
      500,
    );
  }

  const stripeSubscription =
    await stripe.subscriptions.retrieve(subscriptionId);

  const localUser =
    (customerId ? await getUserByCustomerId(customerId) : null) ??
    (session.metadata?.userId
      ? await prisma.user.findUnique({
          where: { id: session.metadata.userId },
        })
      : null);

  if (!localUser) {
    throw new AppError("Unable to resolve subscription user", 500);
  }

  const { isNew } = await applyStripeSubscription(
    stripeSubscription,
    localUser.id,
  );

  if (isNew) {
    await prisma.auditLog.create({
      data: {
        actorId: localUser.id,
        action: "SUBSCRIPTION_STARTED",
        entityType: "Subscription",
        entityId: localUser.id,
      },
    });
  }

  return { activated: true, userId: localUser.id };
};

export const syncCheckoutSession = async (
  sessionId: string,
  expectedUserId?: string,
): Promise<{
  synced: boolean;
  sessionStatus: Stripe.Checkout.Session.Status | null;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
}> => {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string };
    if (error?.statusCode === 404 || error?.code === "resource_missing") {
      throw new AppError("Checkout session not found", 404);
    }
    throw err;
  }

  if (expectedUserId && session.metadata?.userId !== expectedUserId) {
    throw new AppError("Forbidden", 403);
  }

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return {
      synced: false,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
    };
  }

  const result = await activateFromCheckoutSession(session);
  return {
    synced: result.activated,
    sessionStatus: session.status,
    paymentStatus: session.payment_status,
  };
};

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
    subscription?.status === SubscriptionStatus.ACTIVE ||
    subscription?.status === SubscriptionStatus.PAST_DUE
  ) {
    if (subscription.cancelAtPeriodEnd) {
      const periodEndFormatted = subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString().split("T")[0]
        : "";
      throw new AppError(
        `Your subscription is set to cancel on ${periodEndFormatted}. You can subscribe again after it ends.`,
        400,
      );
    }
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

  const frontendBase = config.FRONTEND_BASE_URL?.replace(/\/+$/, "");
  let successUrl: string;
  let cancelUrl: string;

  if (frontendBase) {
    successUrl = `${frontendBase}/premium/success?session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${frontendBase}/premium/cancel`;
  } else {
    const appBase = config.APP_BASE_URL.replace(/\/+$/, "");
    successUrl = `${appBase}/api/v1/payments/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${appBase}/api/v1/payments/checkout-cancel`;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: config.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
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
    console.error("[Stripe] invalid webhook signature");
    throw new AppError("Invalid Stripe webhook signature", 400);
  }

  console.log(`[Stripe] event received ${event.type} ${event.id}`);

  switch (event.type) {
    case "checkout.session.completed": {
      await activateFromCheckoutSession(
        event.data.object as Stripe.Checkout.Session,
      );
      return;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const customerId = stripeId(stripeSubscription.customer);
      if (!customerId) {
        console.warn("[Stripe] Subscription updated event missing customer id");
        return;
      }
      const localSubscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!localSubscription) {
        console.warn(
          `[Stripe] No local subscription found for customer ${customerId}`,
        );
        return;
      }
      await applyStripeSubscription(
        stripeSubscription,
        localSubscription.userId,
      );
      return;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const customerId = stripeId(stripeSubscription.customer);
      if (!customerId) {
        console.warn("[Stripe] Subscription deleted event missing customer id");
        return;
      }
      const localSubscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!localSubscription) {
        console.warn(
          `[Stripe] No local subscription found for customer ${customerId}`,
        );
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: localSubscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            cancelAtPeriodEnd: false,
          },
        });
        await tx.user.update({
          where: { id: localSubscription.userId },
          data: { isPremium: false },
        });
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

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = stripeId(invoice.customer);
      const user = customerId ? await getUserByCustomerId(customerId) : null;
      if (!user || !customerId) {
        throw new AppError("Unable to resolve invoice user", 500);
      }

      const existingPayment = await prisma.payment.findUnique({
        where: { stripeInvoiceId: invoice.id },
      });

      const isNewOrChangedToSucceeded =
        !existingPayment || existingPayment.status !== PaymentStatus.SUCCEEDED;

      const payment = await prisma.payment.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          userId: user.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          stripePaymentIntentId: null,
          stripeInvoiceId: invoice.id,
          status: PaymentStatus.SUCCEEDED,
          purpose: PaymentPurpose.PREMIUM_SUBSCRIPTION,
        },
        update: {
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: PaymentStatus.SUCCEEDED,
        },
      });

      if (isNewOrChangedToSucceeded) {
        await createNotification({
          userId: user.id,
          type: "PAYMENT_SUCCEEDED",
          message: "Your premium subscription payment succeeded",
          relatedEntityType: "Payment",
          relatedEntityId: payment.id,
        });
        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: "PAYMENT_SUCCEEDED",
            entityType: "Payment",
            entityId: user.id,
          },
        });
      }

      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          ...(typeof periodEnd === "number"
            ? { currentPeriodEnd: new Date(periodEnd * 1000) }
            : {}),
          status: SubscriptionStatus.ACTIVE,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: true },
      });
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = stripeId(invoice.customer);
      const user = customerId ? await getUserByCustomerId(customerId) : null;
      if (!user || !customerId) {
        throw new AppError("Unable to resolve invoice user", 500);
      }

      const existingPayment = await prisma.payment.findUnique({
        where: { stripeInvoiceId: invoice.id },
      });

      if (existingPayment?.status === PaymentStatus.SUCCEEDED) {
        return;
      }

      const isNewlyCreated = !existingPayment;

      const payment = await prisma.payment.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          userId: user.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          stripePaymentIntentId: null,
          stripeInvoiceId: invoice.id,
          status: PaymentStatus.FAILED,
          purpose: PaymentPurpose.PREMIUM_SUBSCRIPTION,
        },
        update: {
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: PaymentStatus.FAILED,
        },
      });

      if (isNewlyCreated) {
        await createNotification({
          userId: user.id,
          type: "PAYMENT_FAILED",
          message:
            "Your premium subscription payment failed. Please update your payment method",
          relatedEntityType: "Payment",
          relatedEntityId: payment.id,
        });
        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: "PAYMENT_FAILED",
            entityType: "Payment",
            entityId: user.id,
          },
        });
      }

      const localSubscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
      });
      if (localSubscription?.status === SubscriptionStatus.ACTIVE) {
        await prisma.subscription.update({
          where: { userId: user.id },
          data: { status: SubscriptionStatus.PAST_DUE },
        });
      }
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
