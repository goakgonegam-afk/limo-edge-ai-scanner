import { Suspense } from "react";
import { ConfirmCheckout } from "@/components/ConfirmCheckout";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Payment confirmed · Limo Edge" };
export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <Suspense
          fallback={
            <div className="card mx-auto mt-8 max-w-lg p-6 text-center text-sm text-violet-200/70">
              Confirming your payment…
            </div>
          }
        >
          <ConfirmCheckout />
        </Suspense>
        <p className="mx-auto mt-6 max-w-lg text-center text-[0.7rem] leading-relaxed text-violet-300/55">
          Payments are processed by Stripe. Limo Edge stores only your subscription status — never
          card details. All levels are for paper-trading practice and are not financial advice.
        </p>
      </main>
    </div>
  );
}
