import { SubmitButton } from "@/app/components/submit-button";
import { getCurrentUser, getCurrentUserProfile, getSafeNextPath } from "@/lib/auth";
import { getEnabledOauthProviders, oauthProviderLabels } from "@/lib/oauth-providers";
import { signInAction, signInWithOAuthAction, signUpAction } from "./actions";

function getStatusMessage(searchParams?: Record<string, string | undefined>) {
  if (searchParams?.success === "check-email") {
    return "Rekisteröityminen onnistui. Vahvista tilisi sähköpostissa olevasta linkistä ennen ensimmäistä kirjautumista.";
  }

  if (searchParams?.signedOut === "1") {
    return "Kirjauduit ulos onnistuneesti.";
  }

  switch (searchParams?.error) {
    case "signin":
      return "Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.";
    case "signup":
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
  const profile = await getCurrentUserProfile();
  const nextPath = getSafeNextPath(searchParams?.next);
  const statusMessage = getStatusMessage(searchParams);
  const mode = searchParams?.mode === "signup" ? "signup" : "signin";

  if (user) {
    return (
      <section className="auth-shell">
        <article className="card auth-card auth-card-wide">
          <div className="page-header" style={{ marginBottom: "0.75rem" }}>
            <h1>Tervetuloa takaisin</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Olet kirjautuneena sisään Noemaan.
            </p>
          </div>

          <div className="auth-account-summary">
            <div>
              <strong>{profile?.full_name || user.user_metadata?.full_name || user.email}</strong>
              <p className="status" style={{ margin: "0.35rem 0 0" }}>
                {user.email}
              </p>
            </div>
            <span className="pill" data-variant="primary">
              {user.email_confirmed_at ? "Aktiivinen" : "Odottaa vahvistusta"}
            </span>
          </div>

          {profile?.motivation ? (
            <article className="auth-story-panel">
              <span className="auth-story-label">Miksi haluat olla osa Noema-tarinaa</span>
              <p style={{ margin: "0.45rem 0 0" }}>{profile.motivation}</p>
            </article>
          ) : null}

          {!user.email_confirmed_at ? (
            <p className="status auth-status auth-status-warning">
              Vahvista tili sähköpostiviestin linkistä, jotta aktivointi valmistuu.
            </p>
          ) : null}
        </article>
      </section>
    );
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

      <div className="auth-grid">
        <article className={`card auth-card ${mode === "signin" ? "is-active" : ""}`}>
          <div className="page-header">
            <h2>Kirjaudu</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Email + salasana tai suora jatko yleisillä palveluilla.
            </p>
          </div>

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
        </article>

        <article className={`card auth-card ${mode === "signup" ? "is-active" : ""}`}>
          <div className="page-header">
            <h2>Rekisteröidy</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Yksinkertainen aloitus, jonka jälkeen aktivointi tapahtuu sähköpostilinkin kautta.
            </p>
          </div>

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
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
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
        </article>
      </div>
    </section>
  );
}
