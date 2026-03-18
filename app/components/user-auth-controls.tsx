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
      <Link href="/login?mode=signin&next=%2Fsources" className="button-link secondary auth-header-link">
        Kirjaudu
      </Link>
    );
  }

  const displayName = getDisplayName(user);

  return (
    <div className="auth-header-shell">
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
  );
}
