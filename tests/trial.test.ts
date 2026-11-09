import { describe, expect, it } from "vitest";
import { DAY_MS, TRIAL_DAYS, computeAccess, computeTrial, isSubscriptionActive } from "@/lib/trial";

const createdAt = "2026-01-01T00:00:00.000Z";

describe("five-day free trial", () => {
  it("starts active with five days left", () => {
    const trial = computeTrial(createdAt, new Date("2026-01-01T00:00:00.000Z"));
    expect(TRIAL_DAYS).toBe(5);
    expect(trial.trialActive).toBe(true);
    expect(trial.daysLeft).toBe(5);
    expect(new Date(trial.trialEndsAt).getTime() - new Date(createdAt).getTime()).toBe(5 * DAY_MS);
  });

  it("is still active one millisecond before it ends", () => {
    const now = new Date(new Date(createdAt).getTime() + 5 * DAY_MS - 1);
    expect(computeAccess({ createdAt, subscription: null }, now).hasAccess).toBe(true);
  });

  it("expires exactly at the five-day mark", () => {
    const now = new Date(new Date(createdAt).getTime() + 5 * DAY_MS);
    const access = computeAccess({ createdAt, subscription: null }, now);
    expect(access.hasAccess).toBe(false);
    expect(access.reason).toBe("expired");
  });

  it("grants access while a paid subscription is active", () => {
    const now = new Date(new Date(createdAt).getTime() + 30 * DAY_MS);
    const access = computeAccess(
      {
        createdAt,
        subscription: {
          plan: "monthly",
          status: "active",
          currentPeriodEnd: new Date(now.getTime() + DAY_MS).toISOString(),
        },
      },
      now,
    );
    expect(access.hasAccess).toBe(true);
    expect(access.reason).toBe("subscription");
  });

  it("does not count a canceled or lapsed subscription", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    expect(
      isSubscriptionActive(
        { plan: "monthly", status: "canceled", currentPeriodEnd: new Date(now.getTime() + DAY_MS).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      isSubscriptionActive(
        { plan: "monthly", status: "active", currentPeriodEnd: new Date(now.getTime() - DAY_MS).toISOString() },
        now,
      ),
    ).toBe(false);
  });
});
