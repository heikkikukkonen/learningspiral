import { SubmitButton } from "@/app/components/submit-button";
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
        <p className="muted">
          Määritä oma kieli ja ohjaus, jota käytetään analyysin päivityksessä,
          syvennyksessä, tiivistyksessä, korttien luonnissa ja tunnisteiden ehdottamisessa.
        </p>
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
                Rekisteröityminen, aktivointi ja Noema-tarinasi syy.
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
            <span>Miksi haluat olla osa Noema-tarinaa?</span>
            <p className="status" style={{ margin: 0, color: "var(--text)" }}>
              {profile?.motivation || user.user_metadata?.motivation || "Ei tallennettua perustelua."}
            </p>
          </div>

          {!user.email_confirmed_at ? (
            <p className="status" style={{ margin: 0, color: "var(--danger)" }}>
              Tili aktivoituu vasta, kun sähköpostissa oleva vahvistuslinkki on avattu.
            </p>
          ) : null}
        </article>
      ) : null}

      <form action={saveUserSettingsAction} className="form settings-form">
        <article className="card settings-card">
          <div className="settings-section-header">
            <div>
              <h2 style={{ margin: 0 }}>Kieli</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kaikki sinulle näkyvä sisältö pyydetään
                tällä kielellä.
              </p>
            </div>
            <span className="pill" data-variant="primary">
              User level
            </span>
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
                Näitä kenttiä lisätään sellaisenaan mukaan kyseisen toiminnon
                ohjaukseen.
              </p>
            </div>
          </div>

          <div className="grid settings-grid">
            <label className="form-row">
              <span>Analyysin prompt / refresh</span>
              <textarea
                name="analysisPromptRefresh"
                defaultValue={settings.analysisPromptRefresh}
                placeholder="Esim. pidä näkökulma käytännöllisenä ja tuo esiin päätösvaikutus."
              />
            </label>

            <label className="form-row">
              <span>Analyysin prompt / deepen</span>
              <textarea
                name="analysisPromptDeepen"
                defaultValue={settings.analysisPromptDeepen}
                placeholder="Esim. syvennä trade-offit, riskit ja seuraava konkreettinen askel."
              />
            </label>

            <label className="form-row">
              <span>Analyysin prompt / summarize</span>
              <textarea
                name="analysisPromptSummarize"
                defaultValue={settings.analysisPromptSummarize}
                placeholder="Esim. tiivistä ydinväite, älä menetä toimintaehdotusta."
              />
            </label>

            <label className="form-row">
              <span>Korttien luonti prompt</span>
              <textarea
                name="cardGenerationPrompt"
                defaultValue={settings.cardGenerationPrompt}
                placeholder="Esim. tee korteista päätöksentekoa ja soveltamista tukevia."
              />
            </label>

            <label className="form-row">
              <span>Tunnisteiden luonnin prompt</span>
              <textarea
                name="tagGenerationPrompt"
                defaultValue={settings.tagGenerationPrompt}
                placeholder="Esim. luo 3-6 lyhyttä, hakukelpoista tunnistetta ilman päällekkäisiä synonyymeja."
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
