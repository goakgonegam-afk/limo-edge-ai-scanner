export const TRIAL_DAYS = 5;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export type SubscriptionLike = {
  plan: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
} | null;

export type TrialInfo = {
  trialEndsAt: string;
  trialActive: boolean;
  daysLeft: number;
  hoursLeft: number;
};

/** A trial starts when the account is created and lasts TRIAL_DAYS full days. */
export function computeTrial(createdAt: string | Date, now: Date = new Date()): TrialInfo {
  const start = new Date(createdAt).getTime();
  const safeStart = Number.isFinite(start) ? start : now.getTime();
  const ends = safeStart + TRIAL_DAYS * DAY_MS;
  const msLeft = ends - now.getTime();
  return {
    trialEndsAt: new Date(ends).toISOString(),
    trialActive: msLeft > 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    hoursLeft: Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000))),
  };
}

export function isSubscriptionActive(
  subscription: SubscriptionLike,
  now: Date = new Date(),
): boolean {
  if (!subscription) return false;
  if (subscription.status === "canceled") return false;
  if (subscription.currentPeriodEnd) {
    const end = new Date(subscription.currentPeriodEnd).getTime();
    if (Number.isFinite(end) && end <= now.getTime()) return false;
  }
  return subscription.status === "active" || subscription.status === "past_due";
}

export type AccessState = {
  hasAccess: boolean;
  reason: "subscription" | "trial" | "expired";
  trial: TrialInfo;
  subscriptionActive: boolean;
};

/**
 * Single source of truth for "can this account run an analysis?".
 * Used by the API routes and by the UI badges.
 */
export function computeAccess(
  user: { createdAt: string; subscription: SubscriptionLike },
  now: Date = new Date(),
): AccessState {
  const trial = computeTrial(user.createdAt, now);
  const subscriptionActive = isSubscriptionActive(user.subscription, now);
  if (subscriptionActive) {
    return { hasAccess: true, reason: "subscription", trial, subscriptionActive };
  }
  if (trial.trialActive) {
    return { hasAccess: true, reason: "trial", trial, subscriptionActive };
  }
  return { hasAccess: false, reason: "expired", trial, subscriptionActive };
}
