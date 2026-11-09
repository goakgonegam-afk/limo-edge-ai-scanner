import Link from "next/link";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function SiteHeader() {
  const user = await getSessionUser();
  const publicUser = user ? toPublicUser(user) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-violet-500/15 bg-[#050208]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-400 via-violet-500 to-indigo-600 shadow-[0_10px_28px_-10px_rgba(168,85,247,0.9)]">
            <span className="text-sm font-black text-[#0b0416]">LE</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-violet-50">Limo Edge</span>
            <span className="text-[0.65rem] uppercase tracking-[0.16em] text-violet-300/70">
              chart study lab
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {publicUser ? (
            <>
              <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex">
                Dashboard
              </Link>
              <Link href="/plans" className="btn-ghost hidden sm:inline-flex">
                Plans
              </Link>
              {publicUser.hasAccess ? (
                <span className="badge badge-mint hidden md:inline-flex">
                  {publicUser.accessReason === "subscription"
                    ? "Subscribed"
                    : `Trial · ${publicUser.trialDaysLeft}d left`}
                </span>
              ) : (
                <span className="badge badge-rose hidden md:inline-flex">Access ended</span>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/plans" className="btn-ghost">
                Plans
              </Link>
              <Link href="/login" className="btn-primary">
                Start free trial
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
