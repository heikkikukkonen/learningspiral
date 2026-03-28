import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/login/actions";

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

function getDisplayName(user: NonNullable<CurrentUser>) {
  const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  return metadataName.trim() || user.email || "Noema user";
}

export async function UserAuthControls({ user: initialUser }: { user?: CurrentUser }) {
  const user = initialUser ?? await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link href="/login?mode=signin&next=%2Fapp" className="button-link secondary auth-header-link auth-header-link-desktop">
          Kirjaudu tai rekisteröidy
        </Link>
        <Link
          href="/login?mode=signin&next=%2Fapp"
          className="header-icon auth-header-link-mobile"
          aria-label="Kirjaudu tai rekisteröidy"
          title="Kirjaudu tai rekisteröidy"
        >
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
    </>
  );
}
