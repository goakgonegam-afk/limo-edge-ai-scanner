import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionUser } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/trial";

export const metadata = { title: "Sign in · Limo Edge" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
        <section>
          <span className="badge">{TRIAL_DAYS}-day free trial</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-violet-50 sm:text-4xl">
            Your chart study lab is{" "}
            <span className="text-shine">one screenshot away</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-violet-200/75">
            Create an account to upload chart screenshots, read the EMA 50 / EMA 200 / RSI 14 /
            ATR 14 breakdown and practise entries, stops and targets on paper.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-violet-200/80">
            {[
              "Screenshot upload straight from your phone camera",
              "Educational explanations for every indicator",
              "Practice entry, stop-loss and take-profit levels",
              "Cancel or upgrade from the plans screen anytime",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs leading-relaxed text-violet-300/55">
            Paper-trading practice only. Limo Edge is educational and never places real orders.{" "}
            <Link href="/plans" className="text-violet-200 underline decoration-violet-400/40 underline-offset-4">
              Compare plans
            </Link>
            .
          </p>
        </section>

        <AuthForm />
      </main>
    </div>
  );
}
