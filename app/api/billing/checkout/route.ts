import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkoutLineItem, getStripe, planById } from "@/lib/billing";
import { setSubscription, type StoredUser } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe.", code: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const planId = (body as { plan?: unknown })?.plan;
  const plan = typeof planId === "string" ? planById(planId) : null;
  if (!plan) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Card payments are not configured on this deployment yet. Add STRIPE_SECRET_KEY to enable checkout.",
        code: "billing_unconfigured",
      },
      { status: 503 },
    );
  }

  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await setSubscription(user.id, user.subscription, customerId);
    }

    const origin = baseUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [checkoutLineItem(plan)],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        metadata: { userId: user.id, plan: plan.id },
      },
      metadata: { userId: user.id, plan: plan.id },
      success_url: `${origin}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, plan: plan.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe rejected the checkout request.";
    return NextResponse.json({ error: `Could not start checkout: ${message}` }, { status: 502 });
  }
}

export type { StoredUser };
