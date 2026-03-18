import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { getCurrentUser, getSafeNextPath } from "@/lib/auth";
import { getEnabledOauthProviders, oauthProviderLabels } from "@/lib/oauth-providers";
import { signInAction, signInWithOAuthAction, signUpAction } from "./actions";

function getStatusMessage(searchParams?: Record<string, string | undefined>) {
  const authErrorMessage = searchParams?.errorMessage?.trim();
  const authErrorCode = searchParams?.errorCode?.trim();

  if (searchParams?.success === "check-email") {
    return "Rekisteröityminen onnistui. Vahvista tilisi sähköpostissa olevasta linkistä ennen ensimmäistä kirjautumista.";
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
  const authenticatedRedirectPath = nextPath === "/" ? "/sources" : nextPath;

  if (user) {
    redirect(authenticatedRedirectPath);
  }

  return (
    <section className="auth-shell">
      <div className="auth-hero">
        <span className="pill" data-variant="primary">
          Noema Access
        </span>
        <h1>Kirjaudu sisään tai aloita oma Noema-tarinasi</h1>
        <p className="muted">
          Rekisteröi nimi, email, salasana ja lyhyt perustelu siitä, miksi haluat olla osa
          Noema-tarinaa. Tili aktivoidaan sähköpostiin lähetettävän vahvistuslinkin kautta.
        </p>
      </div>

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
            <p className="muted" style={{ marginBottom: 0 }}>
              {mode === "signin"
                ? "Email + salasana tai suora jatko yleisillä palveluilla."
                : "Yksinkertainen aloitus, jonka jälkeen aktivointi tapahtuu sähköpostilinkin kautta."}
            </p>
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
              <SubmitButton className="primary" pendingText="Luodaan tili...">
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
