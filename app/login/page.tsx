import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { getCurrentUser, getSafeNextPath } from "@/lib/auth";
import { getEnabledOauthProviders, oauthProviderLabels } from "@/lib/oauth-providers";
import {
  requestPasswordResetAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction
} from "./actions";

function getStatusMessage(searchParams?: Record<string, string | undefined>) {
  const authErrorMessage = searchParams?.errorMessage?.trim();
  const authErrorCode = searchParams?.errorCode?.trim();

  if (searchParams?.success === "activated") {
    return "Tili on aktivoitu.";
  }

  if (searchParams?.success === "check-email") {
    return "Rekisteröityminen onnistui. Vahvista tilisi sähköpostissa olevasta linkistä ennen ensimmäistä kirjautumista.";
  }

  if (searchParams?.success === "reset-password-email") {
    return "Salasanan palautuslinkki on lähetetty sähköpostiisi.";
  }

  if (searchParams?.success === "password-reset-complete") {
    return "Salasana on päivitetty. Voit nyt kirjautua uudella salasanalla.";
  }

  if (searchParams?.signedOut === "1") {
    return "Kirjauduit ulos onnistuneesti.";
  }

  switch (searchParams?.error) {
    case "signin":
      if (authErrorCode === "email_not_confirmed" || authErrorMessage === "Email not confirmed") {
        return "Tili on luotu, mutta sähköpostiosoitetta ei ole vielä vahvistettu. Avaa vahvistusviesti ja kokeile sitten uudelleen.";
      }
      return "Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.";
    case "signup":
      if (authErrorMessage?.toLowerCase().includes("error sending confirmation email")) {
        return "Rekisteröityminen epäonnistui, koska Supabase ei saanut lähetettyä vahvistusviestiä. Tarkista Supabasen SMTP-asetukset ja SendGrid-integraatio.";
      }
      if (authErrorMessage?.toLowerCase().includes("rate limit")) {
        return "Vahvistusviestejä on pyydetty liian nopeasti. Odota hetki ja kokeile uudelleen.";
      }
      if (authErrorMessage) {
        return `Rekisteröityminen epäonnistui: ${authErrorMessage}`;
      }
      return "Rekisteröityminen epäonnistui. Tarkista tiedot tai kokeile toista sähköpostia.";
    case "oauth-start":
      return "OAuth-kirjautumisen aloitus epäonnistui. Varmista, että provider on aktivoitu Supabasessa.";
    case "oauth-provider":
      return "Valittu kirjautumistapa ei ole käytössä tässä ympäristössä.";
    case "auth-callback":
      return "Tilin vahvistus tai kirjautumisen viimeistely epäonnistui. Kokeile linkkiä uudelleen.";
    case "reset-password":
      if (authErrorMessage) {
        return `Salasanan palautus epäonnistui: ${authErrorMessage}`;
      }
      return "Salasanan palautus epäonnistui. Kokeile hetken päästä uudelleen.";
    default:
      return "";
  }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const oauthProviders = getEnabledOauthProviders().map((provider) => ({
    id: provider,
    label: oauthProviderLabels[provider] ?? provider
  }));
  const user = await getCurrentUser();
  const nextPath = getSafeNextPath(searchParams?.next);
  const statusMessage = getStatusMessage(searchParams);
  const mode = searchParams?.mode === "signup" ? "signup" : "signin";
  const alternateMode = mode === "signup" ? "signin" : "signup";
  const authenticatedRedirectPath = nextPath === "/" ? "/app" : nextPath;
  const isAwaitingEmailConfirmation = searchParams?.success === "check-email";

  if (user) {
    redirect(authenticatedRedirectPath);
  }

  return (
    <section className="auth-shell">
      {statusMessage ? (
        <article
          className={
            searchParams?.error
              ? "card auth-status auth-status-error"
              : "card auth-status auth-status-success"
          }
        >
          {statusMessage}
        </article>
      ) : null}

      <div className="auth-mode-switch" role="tablist" aria-label="Kirjautumisen tila">
        <Link
          href={`/login?mode=signin&next=${encodeURIComponent(nextPath)}`}
          className={mode === "signin" ? "auth-mode-pill is-active" : "auth-mode-pill"}
          aria-current={mode === "signin" ? "page" : undefined}
        >
          Kirjaudu
        </Link>
        <Link
          href={`/login?mode=signup&next=${encodeURIComponent(nextPath)}`}
          className={mode === "signup" ? "auth-mode-pill is-active" : "auth-mode-pill"}
          aria-current={mode === "signup" ? "page" : undefined}
        >
          Rekisteröidy
        </Link>
      </div>

      <div className="auth-grid auth-grid-single">
        <article className="card auth-card auth-card-wide is-active">
          <div className="page-header">
            <h2>{mode === "signin" ? "Kirjaudu" : "Rekisteröidy"}</h2>
          </div>

          {mode === "signin" ? (
            <>
              <form action={signInAction} className="form auth-form">
                <input type="hidden" name="next" value={nextPath} />
                <label className="form-row">
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <label className="form-row">
                  <span>Salasana</span>
                  <input name="password" type="password" autoComplete="current-password" required />
                </label>
                <SubmitButton className="primary" pendingText="Kirjaudutaan...">
                  Kirjaudu sisään
                </SubmitButton>
              </form>

              <details className="auth-account-summary">
                <summary>Unohtuiko salasana?</summary>
                <form action={requestPasswordResetAction} className="form auth-form">
                  <input type="hidden" name="next" value={nextPath} />
                  <label className="form-row">
                    <span>Email</span>
                    <input name="email" type="email" autoComplete="email" required />
                  </label>
                  <SubmitButton className="secondary" pendingText="Lähetetään...">
                    Lähetä palautuslinkki
                  </SubmitButton>
                </form>
              </details>

              {oauthProviders.length ? (
                <>
                  <div className="auth-divider">tai jatka palvelulla</div>
                  <div className="auth-provider-list">
                    {oauthProviders.map((provider) => (
                      <form action={signInWithOAuthAction} key={provider.id}>
                        <input type="hidden" name="next" value={nextPath} />
                        <input type="hidden" name="provider" value={provider.id} />
                        <SubmitButton
                          className="secondary auth-provider-button"
                          pendingText="Siirrytään..."
                        >
                          Jatka {provider.label}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : isAwaitingEmailConfirmation ? (
            <div className="auth-account-summary">
              <p>
                Tarkista sähköpostisi ja avaa vahvistuslinkki viimeistelläksesi tilin
                aktivoinnin.
              </p>
            </div>
          ) : (
            <form action={signUpAction} className="form auth-form">
              <input type="hidden" name="next" value={nextPath} />
              <label className="form-row">
                <span>Nimi</span>
                <input name="fullName" autoComplete="name" required />
              </label>
              <label className="form-row">
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="form-row">
                <span>Salasana</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="form-row">
                <span>Miksi haluat olla osa Noema-tarinaa?</span>
                <textarea
                  name="motivation"
                  placeholder="Muutama lause siitä, mitä haluat Noeman avulla rakentaa tai ymmärtää syvemmin."
                  minLength={10}
                  required
                />
              </label>
              <SubmitButton className="primary" pendingText="Luon tilin...">
                Luo tili
              </SubmitButton>
            </form>
          )}

          <p className="muted auth-mode-meta">
            {mode === "signin" ? "Eikö sinulla vielä ole tiliä?" : "Onko sinulla jo tili?"}{" "}
            <Link
              href={`/login?mode=${alternateMode}&next=${encodeURIComponent(nextPath)}`}
              className="landing-inline-link"
            >
              {mode === "signin" ? "Rekisteröidy tästä" : "Kirjaudu tästä"}
            </Link>
          </p>
        </article>
      </div>
    </section>
  );
}
