import { SubmitButton } from "@/app/components/submit-button";
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
  const settings = await getUserSettings();
  const saved = searchParams?.saved === "1";
  const pushConfigured = isPushConfigured();
  const pushPublicKey = pushConfigured ? getPushPublicKey() : "";

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Asetukset</h1>
        <p className="muted">
          Maarita oma kieli ja AI-ohjaus, jota kaytetaan analyysin paivityksessa,
          syvennyksessa, tiivistyksessa, korttien luonnissa ja tagien generoinnissa.
        </p>
        {saved ? (
          <p className="status" style={{ margin: "0.5rem 0 0", color: "var(--success)" }}>
            Asetukset tallennettu onnistuneesti.
          </p>
        ) : null}
      </div>

      <form action={saveUserSettingsAction} className="form settings-form">
        <article className="card settings-card">
          <div className="settings-section-header">
            <div>
              <h2 style={{ margin: 0 }}>Kieli</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kaikki ChatGPT-agentin tuottama kayttajalle nakyva sisalto pyydetaan
                talla kielella.
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
                Naita kenttia lisataan sellaisenaan mukaan kyseisen AI-toiminnon
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
                placeholder="Esim. pida nakokulma kaytannollisena ja tuo esiin paatosvaikutus."
              />
            </label>

            <label className="form-row">
              <span>Analyysin prompt / deepen</span>
              <textarea
                name="analysisPromptDeepen"
                defaultValue={settings.analysisPromptDeepen}
                placeholder="Esim. syvenna trade-offit, riskit ja seuraava konkreettinen askel."
              />
            </label>

            <label className="form-row">
              <span>Analyysin prompt / summarize</span>
              <textarea
                name="analysisPromptSummarize"
                defaultValue={settings.analysisPromptSummarize}
                placeholder="Esim. tiivista ydinvaite, ala menetä toimintaehdotusta."
              />
            </label>

            <label className="form-row">
              <span>Korttien luonti prompt</span>
              <textarea
                name="cardGenerationPrompt"
                defaultValue={settings.cardGenerationPrompt}
                placeholder="Esim. tee korteista paatoksentekoa ja soveltamista tukevia."
              />
            </label>

            <label className="form-row">
              <span>Tagien luonnin prompt</span>
              <textarea
                name="tagGenerationPrompt"
                defaultValue={settings.tagGenerationPrompt}
                placeholder="Esim. luo 3-6 lyhytta, hakukelpoista tagia ilman paallekkaisia synonyymeja."
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
