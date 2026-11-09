import type Stripe from "stripe";
import { findUserByStripeCustomer, getUserById, setSubscription, type PlanId } from "./store";
import type { SubscriptionStatus } from "./trial";

/** Stripe moved current_period_end across API versions; read both shapes safely. */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const candidate = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const seconds =
    typeof candidate.current_period_end === "number"
      ? candidate.current_period_end
      : candidate.items?.data?.[0]?.current_period_end;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  return "canceled";
}

function planFromSubscription(subscription: Stripe.Subscription, fallback: string | null): PlanId {
  const raw = subscription.metadata?.plan ?? fallback ?? "";
  return raw === "yearly" ? "yearly" : "monthly";
}

async function resolveUserId(
  subscription: Stripe.Subscription,
  hints: { userId: string | null; plan: string | null },
): Promise<string | null> {
  if (hints.userId) return hints.userId;
  if (subscription.metadata?.userId) return subscription.metadata.userId;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const byCustomer = await findUserByStripeCustomer(customerId);
  return byCustomer?.id ?? null;
}

/** Applies a verified Stripe subscription to the matching account. */
export async function activateFromSubscription(
  subscription: Stripe.Subscription,
  hints: { userId: string | null; plan: string | null },
): Promise<void> {
  const userId = await resolveUserId(subscription, hints);
  if (!userId) return;

  const user = await getUserById(userId);
  if (!user) return;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  await setSubscription(
    userId,
    {
      plan: planFromSubscription(subscription, hints.plan),
      status: mapStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: periodEnd(subscription),
      updatedAt: new Date().toISOString(),
    },
    customerId,
  );
}

export async function revokeSubscription(subscriptionId: string): Promise<void> {
  const { findUserByStripeSubscription } = await import("./store");
  const user = await findUserByStripeSubscription(subscriptionId);
  if (!user || !user.subscription) return;
  await setSubscription(user.id, {
    ...user.subscription,
    status: "canceled",
    currentPeriodEnd: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function markPaymentFailed(subscriptionId: string): Promise<void> {
  const { findUserByStripeSubscription } = await import("./store");
  const user = await findUserByStripeSubscription(subscriptionId);
  if (!user || !user.subscription) return;
  await setSubscription(user.id, {
    ...user.subscription,
    status: "past_due",
    updatedAt: new Date().toISOString(),
  });
}
