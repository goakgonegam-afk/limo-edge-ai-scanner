import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { PLANS, formatPlanPrice, isBillingConfigured } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/trial";

export const metadata = { title: "Plans · Limo Edge" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getSessionUser();
  const publicUser = user ? toPublicUser(user) : null;
  const configured = isBillingConfigured();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="max-w-2xl">
          <span className="badge">Real payments · secure Stripe checkout</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-violet-50 sm:text-4xl">
            Pick a plan and keep the <span className="text-shine">practice going</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-violet-200/75">
            Every new account starts with a {TRIAL_DAYS}-day free trial. After that, a subscription
            keeps unlimited screenshot analyses, indicator breakdowns and practice levels available.
            Payments are processed by Stripe — Limo Edge never sees your card details.
          </p>
        </header>

        {publicUser ? (
          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-violet-300/60">Signed in as</p>
              <p className="text-sm font-medium text-violet-50">{publicUser.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-violet-300/60">Current access</p>
              <p className="text-sm font-medium text-violet-50">
                {publicUser.subscriptionActive
                  ? `Subscribed · ${publicUser.subscription?.plan ?? "plan"}${
                      publicUser.subscription?.currentPeriodEnd
                        ? ` until ${formatDate(publicUser.subscription.currentPeriodEnd)}`
                        : ""
                    }`
                  : publicUser.trialActive
                    ? `Free trial · ${publicUser.trialDaysLeft} day${publicUser.trialDaysLeft === 1 ? "" : "s"} left`
                    : "Trial ended"}
              </p>
            </div>
          </div>
        ) : (
          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-violet-200/80">
              Create an account first — your {TRIAL_DAYS}-day trial starts instantly.
            </p>
            <Link href="/login" className="btn-primary">
              Create account
            </Link>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`card card-shine flex flex-col p-5 sm:p-6 ${
                plan.highlight ? "border-fuchsia-400/45 shadow-[0_30px_80px_-30px_rgba(217,70,239,0.65)]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-violet-50">{plan.name}</h2>
                  <p className="mt-1 text-xs text-violet-300/65">{plan.tagline}</p>
                </div>
                {plan.badge ? <span className="badge badge-mint">{plan.badge}</span> : null}
              </div>

              <div className="mt-4 flex items-end gap-2">
                <span className="stat-value text-4xl font-semibold text-shine">{plan.priceLabel}</span>
                <span className="pb-1 text-xs text-violet-300/70">{plan.cadenceLabel}</span>
              </div>
              <p className="mt-1 text-[0.7rem] text-violet-300/55">
                Billed {formatPlanPrice(plan)} · cancel anytime
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-violet-200/80">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {publicUser ? (
                <CheckoutButton
                  planId={plan.id}
                  label={configured ? `Subscribe — ${plan.priceLabel} ${plan.cadenceLabel}` : "Payments not configured yet"}
                  highlight={plan.highlight}
                  disabled={!configured}
                />
              ) : (
                <Link href="/login" className={`${plan.highlight ? "btn-primary" : "btn-ghost"} mt-5 w-full`}>
                  Start trial to subscribe
                </Link>
              )}
            </article>
          ))}
        </section>

        {!configured ? (
          <section className="card mt-5 border-amber-400/30 p-5">
            <h2 className="text-sm font-semibold text-amber-200">Payments need Stripe keys</h2>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
              Checkout is disabled because this deployment has no Stripe credentials. Add{" "}
              <code className="rounded bg-black/50 px-1 py-0.5">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-black/50 px-1 py-0.5">STRIPE_WEBHOOK_SECRET</code> in
              Settings → Environment, then point a Stripe webhook at{" "}
              <code className="rounded bg-black/50 px-1 py-0.5">/api/billing/webhook</code> for the{" "}
              <code className="rounded bg-black/50 px-1 py-0.5">checkout.session.completed</code>,{" "}
              <code className="rounded bg-black/50 px-1 py-0.5">customer.subscription.updated</code>{" "}
              and{" "}
              <code className="rounded bg-black/50 px-1 py-0.5">customer.subscription.deleted</code>{" "}
              events. No plan is activated without a verified payment.
            </p>
          </section>
        ) : (
          <section className="card mt-5 p-5">
            <h2 className="text-sm font-semibold text-violet-50">How billing works</h2>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-violet-200/75">
              <li>• Stripe Checkout collects the card; the app only stores your subscription status.</li>
              <li>• Access unlocks after Stripe confirms the payment through a signed webhook.</li>
              <li>• Cancel from the Stripe customer portal link in your receipt; access runs to the period end.</li>
              <li>• Prices are charged in USD through your own Stripe account.</li>
            </ul>
          </section>
        )}

        <p className="mt-6 text-[0.72rem] leading-relaxed text-violet-300/55">
          Limo Edge is an educational chart study tool for paper-trading practice. Subscriptions pay
          for the analysis software only — never for trading signals or investment advice.
        </p>
      </main>
    </div>
  );
}
