import { getUserSettings } from "@/lib/db";
import { saveUserSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Asetukset</h1>
        <p className="muted">
          Maarita oma kieli ja AI-ohjaus, jota kaytetaan analyysin paivityksessa,
          syvennyksessa, tiivistyksessa ja korttien luonnissa.
        </p>
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
          </div>
        </article>

        <div className="actions">
          <button type="submit">Tallenna asetukset</button>
        </div>
      </form>
    </section>
  );
}
