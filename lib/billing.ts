import Stripe from "stripe";
import type { PlanId } from "./store";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  priceLabel: string;
  cadenceLabel: string;
  features: string[];
  highlight: boolean;
  badge?: string;
};

export const PLANS: PlanDefinition[] = [
  {
    id: "monthly",
    name: "Edge Monthly",
    tagline: "Full access, cancel whenever you like.",
    amountCents: 1900,
    currency: "usd",
    interval: "month",
    priceLabel: "$19",
    cadenceLabel: "per month",
    features: [
      "Unlimited screenshot analyses",
      "EMA 50 / EMA 200 / RSI 14 / ATR 14 breakdowns",
      "Entry, stop-loss and take-profit practice levels",
      "Saved analysis history",
    ],
    highlight: false,
  },
  {
    id: "yearly",
    name: "Edge Yearly",
    tagline: "Two months free compared with monthly.",
    amountCents: 14900,
    currency: "usd",
    interval: "year",
    priceLabel: "$149",
    cadenceLabel: "per year",
    features: [
      "Everything in Edge Monthly",
      "Priority analysis queue",
      "Yearly billing at $12.42 per month",
      "Same paper-trading-only toolkit",
    ],
    highlight: true,
    badge: "Best value",
  },
];

export function planById(id: string): PlanDefinition | null {
  return PLANS.find((plan) => plan.id === id) ?? null;
}

let cachedClient: Stripe | null = null;
let cachedKey: string | null = null;

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new Stripe(key, { typescript: true });
    cachedKey = key;
  }
  return cachedClient;
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

/** Optional pre-created Stripe price ids, e.g. STRIPE_PRICE_MONTHLY. */
export function priceIdFor(plan: PlanId): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}`;
  return process.env[key] || null;
}

export function checkoutLineItem(plan: PlanDefinition): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = priceIdFor(plan.id);
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }
  return {
    quantity: 1,
    price_data: {
      currency: plan.currency,
      unit_amount: plan.amountCents,
      recurring: { interval: plan.interval },
      product_data: {
        name: `Limo Edge — ${plan.name}`,
        description: plan.tagline,
      },
    },
  };
}

export function formatPlanPrice(plan: PlanDefinition): string {
  return `${plan.priceLabel} ${plan.cadenceLabel}`;
}
