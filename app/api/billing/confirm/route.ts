import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe } from "@/lib/billing";
import { activateFromSubscription } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirms a Checkout session when the customer returns from Stripe.
 * The session must belong to the signed-in account and be paid; the webhook
 * remains the authoritative activation path.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to confirm the subscription.", code: "unauthenticated" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Card payments are not configured on this deployment." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const sessionId = (body as { sessionId?: unknown })?.sessionId;
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing checkout session id." }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    const owner = session.metadata?.userId ?? session.client_reference_id ?? null;
    if (owner !== user.id) {
      return NextResponse.json({ error: "That checkout does not belong to this account." }, { status: 403 });
    }
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json(
        { error: "Payment is not confirmed yet. Refresh in a moment — Stripe will notify us.", code: "pending" },
        { status: 409 },
      );
    }

    if (session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
      await activateFromSubscription(subscription, {
        userId: user.id,
        plan: session.metadata?.plan ?? null,
      });
    }

    return NextResponse.json({ ok: true, plan: session.metadata?.plan ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe request failed.";
    return NextResponse.json({ error: `Could not confirm the payment: ${message}` }, { status: 502 });
  }
}
