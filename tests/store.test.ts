import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSessionToken, verifySessionToken } from "@/lib/session";
import {
  addAnalysis,
  createUser,
  findUserByEmail,
  findUserByStripeSubscription,
  listAnalyses,
  resetStore,
  setSubscription,
  StoreError,
} from "@/lib/store";
import { DAY_MS, TRIAL_DAYS } from "@/lib/trial";

beforeEach(async () => {
  await resetStore();
});

describe("accounts", () => {
  it("creates an account with a five-day trial", async () => {
    const user = await createUser("Trader@Example.com ", "supersecret1");
    expect(user.email).toBe("trader@example.com");
    const span = new Date(user.trialEndsAt).getTime() - new Date(user.createdAt).getTime();
    expect(span).toBe(TRIAL_DAYS * DAY_MS);
    expect(user.subscription).toBeNull();
    expect(user.passwordHash).not.toContain("supersecret1");
  });

  it("refuses duplicate emails and weak passwords", async () => {
    await createUser("dup@example.com", "supersecret1");
    await expect(createUser("dup@example.com", "supersecret2")).rejects.toBeInstanceOf(StoreError);
    await expect(createUser("short@example.com", "123")).rejects.toBeInstanceOf(StoreError);
    await expect(createUser("not-an-email", "supersecret1")).rejects.toBeInstanceOf(StoreError);
  });

  it("verifies the stored password hash", async () => {
    const user = await createUser("login@example.com", "supersecret1");
    const stored = await findUserByEmail("LOGIN@example.com");
    expect(stored?.id).toBe(user.id);
    expect(verifyPassword("supersecret1", stored!.passwordHash, stored!.passwordSalt)).toBe(true);
    expect(verifyPassword("wrong-password", stored!.passwordHash, stored!.passwordSalt)).toBe(false);
  });

  it("hashes the same password differently per account", () => {
    const a = hashPassword("supersecret1");
    const b = hashPassword("supersecret1");
    expect(a.hash).not.toBe(b.hash);
    expect(verifyPassword("supersecret1", a.hash, a.salt)).toBe(true);
  });
});

describe("analysis history", () => {
  it("stores analyses newest first and caps the log", async () => {
    const user = await createUser("log@example.com", "supersecret1");
    for (let i = 0; i < 55; i++) {
      await addAnalysis(user.id, {
        id: `analysis-${i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
        symbol: "BTCUSDT",
        lastPrice: 100 + i,
        bias: "long",
        entry: 100 + i,
        stopLoss: 95 + i,
        takeProfit: 110 + i,
        rsi14: 55,
        atrPercent: 1.2,
        bars: 200,
        chartType: "candles",
      });
    }
    const latest = await listAnalyses(user.id, 5);
    expect(latest).toHaveLength(5);
    expect(latest[0].id).toBe("analysis-54");
  });
});

describe("subscription storage", () => {
  it("finds an account by its Stripe subscription id", async () => {
    const user = await createUser("stripe@example.com", "supersecret1");
    await setSubscription(
      user.id,
      {
        plan: "yearly",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_abc",
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
      "cus_123",
    );
    const found = await findUserByStripeSubscription("sub_abc");
    expect(found?.id).toBe(user.id);
    expect(found?.subscription?.plan).toBe("yearly");
    expect(found?.stripeCustomerId).toBe("cus_123");
  });
});

describe("session tokens", () => {
  const secret = "test-session-secret";

  it("round-trips a signed token", () => {
    const token = signSessionToken("user-1", secret);
    expect(verifySessionToken(token, secret)?.userId).toBe("user-1");
  });

  it("rejects a tampered or foreign signature", () => {
    const token = signSessionToken("user-1", secret);
    expect(verifySessionToken(`${token}x`, secret)).toBeNull();
    expect(verifySessionToken(token, "another-secret")).toBeNull();
    expect(verifySessionToken("garbage", secret)).toBeNull();
  });
});
