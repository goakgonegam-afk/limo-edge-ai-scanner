import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getWebhookSecret } from "@/lib/billing";
import { activateFromSubscription, markPaymentFailed, revokeSubscription } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Every state change is verified against the signing secret,
 * so no subscription can be unlocked by calling this endpoint directly.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Webhook is not configured: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await activateFromSubscription(subscription, {
            userId: session.metadata?.userId ?? session.client_reference_id ?? null,
            plan: session.metadata?.plan ?? null,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status === "canceled") {
          await revokeSubscription(subscription.id);
        } else {
          await activateFromSubscription(subscription, {
            userId: subscription.metadata?.userId ?? null,
            plan: subscription.metadata?.plan ?? null,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await revokeSubscription(subscription.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.parent === "object" && invoice.parent?.subscription_details?.subscription
            ? typeof invoice.parent.subscription_details.subscription === "string"
              ? invoice.parent.subscription_details.subscription
              : invoice.parent.subscription_details.subscription.id
            : null;
        if (subscriptionId) await markPaymentFailed(subscriptionId);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "handler failed";
    return NextResponse.json({ error: `Webhook handling failed: ${message}` }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
