import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/login/actions";

function getDisplayName(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  return metadataName.trim() || user.email || "Noema user";
}

export async function UserAuthControls() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link href="/login?mode=signin&next=%2Fapp" className="button-link secondary auth-header-link auth-header-link-desktop">
          Kirjaudu
        </Link>
        <Link href="/login?mode=signin&next=%2Fapp" className="header-icon auth-header-link-mobile" aria-label="Kirjaudu" title="Kirjaudu">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.25 10.25V8.5a2.75 2.75 0 115.5 0v1.75M8 10.25h8a1 1 0 011 1V18a1 1 0 01-1 1H8a1 1 0 01-1-1v-6.75a1 1 0 011-1z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </Link>
      </>
    );
  }

  const displayName = getDisplayName(user);

  return (
    <>
      <div className="auth-header-shell auth-header-shell-desktop">
        <div className="auth-header-copy">
          <span className="auth-header-name">{displayName}</span>
          <span className="auth-header-status">
            {user.email_confirmed_at ? "Tili aktiivinen" : "Vahvista email"}
          </span>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="secondary auth-header-signout">
            Kirjaudu ulos
          </button>
        </form>
      </div>
      <form action={signOutAction} className="auth-header-mobile-form">
        <button type="submit" className="header-icon auth-header-icon-button" aria-label="Kirjaudu ulos" title="Kirjaudu ulos">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 8.25V7a3 3 0 10-6 0v3.25M8 10.25h8a1 1 0 011 1V18a1 1 0 01-1 1H8a1 1 0 01-1-1v-6.75a1 1 0 011-1z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path d="M17 12l2.75 0M18.85 10.15L20.7 12l-1.85 1.85" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </button>
      </form>
    </>
  );
}
