import type { Request, Response } from "express";
import type Stripe from "stripe";
import { PlanType, SubscriptionStatus } from "@devscope/db";
import { prisma } from "../lib/prisma";
import { getStripe } from "../lib/stripe";

function subscriptionIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") {
    return sub;
  }
  if (sub && typeof sub === "object" && "id" in sub) {
    return sub.id;
  }
  return null;
}

export async function createCheckoutSession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      res.status(500).json({ error: "Billing not configured" });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const stripe = getStripe();

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { clerkId: user.clerkId },
      });
      user = await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard?upgraded=true`,
      cancel_url: `${frontendUrl}/dashboard/billing`,
      metadata: { clerkId: user.clerkId },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      res.status(500).json({ error: "Failed to create checkout session" });
      return;
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createPortalSession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer for this user" });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/dashboard/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function subscriptionStatus(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELLED;
    default:
      return SubscriptionStatus.INACTIVE;
  }
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).send("Webhook not configured");
    return;
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    res.status(500).send("Stripe not configured");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).send("Missing stripe-signature");
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = req.body;
    const payload =
      Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody));
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = session.metadata?.clerkId;
        const subId = subscriptionIdFromCheckoutSession(session);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (clerkId && subId) {
          await prisma.user.updateMany({
            where: { clerkId },
            data: {
              plan: PlanType.PRO,
              stripeSubscriptionId: subId,
              subscriptionStatus: SubscriptionStatus.ACTIVE,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const status = mapStripeSubscriptionStatus(sub.status);
        const isCanceled =
          sub.status === "canceled" || sub.status === "incomplete_expired";

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            subscriptionStatus: status,
            ...(isCanceled
              ? { plan: PlanType.FREE }
              : sub.status === "active" || sub.status === "trialing"
                ? { plan: PlanType.PRO }
                : {}),
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            plan: PlanType.FREE,
            subscriptionStatus: SubscriptionStatus.CANCELLED,
            stripeSubscriptionId: null,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error", err);
  }

  res.status(200).json({ received: true });
}
