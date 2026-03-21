import { SubmitButton } from "@/app/components/submit-button";
import { signOutAction } from "@/app/login/actions";
import { getCurrentUser, getCurrentUserProfile } from "@/lib/auth";
import { getUserSettings } from "@/lib/db";
import { getPushPublicKey, isPushConfigured } from "@/lib/push";
import { saveUserSettingsAction } from "./actions";
import { NotificationTester } from "./notification-tester";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  const user = await getCurrentUser();
  const profile = await getCurrentUserProfile();
  const settings = await getUserSettings();
  const saved = searchParams?.saved === "1";
  const pushConfigured = isPushConfigured();
  const pushPublicKey = pushConfigured ? getPushPublicKey() : "";

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Asetukset</h1>
        <p className="muted">Hallitse omaa Noemaasi ja sovelluksen asetuksia.</p>
        {saved ? (
          <p className="status" style={{ margin: "0.5rem 0 0", color: "var(--success)" }}>
            Asetukset tallennettu onnistuneesti.
          </p>
        ) : null}
      </div>

      {user ? (
        <article className="card settings-card">
          <div className="settings-section-header">
            <div>
              <h2 style={{ margin: 0 }}>Tili</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kayttajan tiedot ja tilin tila.
              </p>
            </div>
            <span className="pill" data-variant="primary">
              {user.email_confirmed_at ? "Aktiivinen" : "Vahvistus kesken"}
            </span>
          </div>

          <div className="grid grid-cols-2">
            <div className="form-row">
              <span>Nimi</span>
              <strong>{profile?.full_name || user.user_metadata?.full_name || "-"}</strong>
            </div>
            <div className="form-row">
              <span>Email</span>
              <strong>{user.email || "-"}</strong>
            </div>
          </div>

          <div className="form-row">
            <span>Miksi haluat olla osa Noemaa?</span>
            <p className="status" style={{ margin: 0, color: "var(--text)" }}>
              {profile?.motivation || user.user_metadata?.motivation || "Ei tallennettua perustelua."}
            </p>
          </div>

          {!user.email_confirmed_at ? (
            <p className="status" style={{ margin: 0, color: "var(--danger)" }}>
              Tili aktivoituu vasta, kun sahkopostissa oleva vahvistuslinkki on avattu.
            </p>
          ) : null}

          <form action={signOutAction} className="settings-signout-mobile">
            <button type="submit" className="secondary">
              Kirjaudu ulos
            </button>
          </form>
        </article>
      ) : null}

      <form action={saveUserSettingsAction} className="form settings-form">
        <article className="card settings-card">
          <div className="settings-section-header">
            <div>
              <h2 style={{ margin: 0 }}>Kieli</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kaikki sinulle nakyva sisalto pyydetaan talla kielella.
              </p>
            </div>
            <span className="pill" data-variant="primary">Kaytossa</span>
          </div>

          <label className="form-row">
            <span>Vastauskieli</span>
            <input
              name="responseLanguage"
              defaultValue={settings.responseLanguage}
              placeholder="Finnish, English, Swedish..."
              required
            />
          </label>
        </article>

        <article className="card settings-card">
          <div className="settings-section-header">
            <div>
              <h2 style={{ margin: 0 }}>Prompt-ohjaus</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Naita kenttia lisataan sellaisenaan mukaan kyseisen toiminnon ohjaukseen.
              </p>
            </div>
          </div>

          <div className="grid settings-grid">
            <label className="form-row">
              <span>Noeman prompt / refresh</span>
              <textarea
                name="analysisPromptRefresh"
                defaultValue={settings.analysisPromptRefresh}
                placeholder="Esim. pida nakokulma kaytannollisena ja tuo esiin paatosvaikutus."
              />
            </label>

            <label className="form-row">
              <span>Noeman prompt / deepen</span>
              <textarea
                name="analysisPromptDeepen"
                defaultValue={settings.analysisPromptDeepen}
                placeholder="Esim. syvenna trade-offit, riskit ja seuraava konkreettinen askel."
              />
            </label>

            <label className="form-row">
              <span>Noeman prompt / summarize</span>
              <textarea
                name="analysisPromptSummarize"
                defaultValue={settings.analysisPromptSummarize}
                placeholder="Esim. tiivista ydinvaite, ala menetä toimintaehdotusta."
              />
            </label>

            <label className="form-row">
              <span>Tehtavien luonti prompt</span>
              <textarea
                name="cardGenerationPrompt"
                defaultValue={settings.cardGenerationPrompt}
                placeholder="Esim. tee tehtavista paatoksentekoa ja soveltamista tukevia."
              />
            </label>

            <label className="form-row">
              <span>Tunnisteiden luonnin prompt</span>
              <textarea
                name="tagGenerationPrompt"
                defaultValue={settings.tagGenerationPrompt}
                placeholder="Esim. luo 3-6 lyhytta, hakukelpoista tunnistetta ilman paallekkaisia synonyymeja."
              />
            </label>
          </div>
        </article>

        <div className="actions">
          <SubmitButton pendingText="Tallennetaan asetuksia...">
            Tallenna asetukset
          </SubmitButton>
        </div>
      </form>

      <NotificationTester pushConfigured={pushConfigured} pushPublicKey={pushPublicKey} />
    </section>
  );
}
