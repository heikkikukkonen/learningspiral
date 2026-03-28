import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { getCurrentUser } from "@/lib/auth";
import { updatePasswordAction } from "./actions";

function getStatusMessage(searchParams?: Record<string, string | undefined>) {
  const authErrorMessage = searchParams?.errorMessage?.trim();

  switch (searchParams?.error) {
    case "password-too-short":
      return "Salasanan tulee olla vahintaan 8 merkki.";
    case "password-mismatch":
      return "Salasanat eivat taysmaa.";
    case "update-failed":
      if (authErrorMessage) {
        return `Salasanan paivitys epaonnistui: ${authErrorMessage}`;
      }
      return "Salasanan paivitys epaonnistui.";
    default:
      return "";
  }
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const user = await getCurrentUser();
  const statusMessage = getStatusMessage(searchParams);

  if (!user) {
    redirect("/login?mode=signin");
  }

  return (
    <section className="auth-shell">
      {statusMessage ? <article className="card auth-status auth-status-error">{statusMessage}</article> : null}

      <div className="auth-grid auth-grid-single">
        <article className="card auth-card auth-card-wide is-active">
          <div className="page-header">
            <h2>Aseta uusi salasana</h2>
          </div>

          <form action={updatePasswordAction} className="form auth-form">
            <label className="form-row">
              <span>Uusi salasana</span>
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="form-row">
              <span>Vahvista salasana</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <SubmitButton className="primary" pendingText="Tallennan...">
              Tallenna uusi salasana
            </SubmitButton>
          </form>

          <p className="muted auth-mode-meta">
            <Link href="/login?mode=signin" className="landing-inline-link">
              Palaa kirjautumiseen
            </Link>
          </p>
        </article>
      </div>
    </section>
  );
}
