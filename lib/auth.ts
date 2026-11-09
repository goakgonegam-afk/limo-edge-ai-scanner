import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_MS, signSessionToken, verifySessionToken } from "./session";
import { getSessionSecret, getUserById, type StoredUser } from "./store";
import { computeAccess } from "./trial";

export async function getSessionUser(): Promise<StoredUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = await getSessionSecret();
  const payload = verifySessionToken(token, secret);
  if (!payload) return null;
  return getUserById(payload.userId);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const secret = await getSessionSecret();
  const token = signSessionToken(userId, secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
  trialEndsAt: string;
  trialDaysLeft: number;
  trialHoursLeft: number;
  trialActive: boolean;
  subscriptionActive: boolean;
  hasAccess: boolean;
  accessReason: "subscription" | "trial" | "expired";
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  analysisCount: number;
};

export function toPublicUser(user: StoredUser, now: Date = new Date()): PublicUser {
  const access = computeAccess(user, now);
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    trialEndsAt: access.trial.trialEndsAt,
    trialDaysLeft: access.trial.daysLeft,
    trialHoursLeft: access.trial.hoursLeft,
    trialActive: access.trial.trialActive,
    subscriptionActive: access.subscriptionActive,
    hasAccess: access.hasAccess,
    accessReason: access.reason,
    subscription: user.subscription
      ? {
          plan: user.subscription.plan,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
        }
      : null,
    analysisCount: user.analyses.length,
  };
}
