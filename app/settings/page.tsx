import { SubmitButton } from "@/app/components/submit-button";
import { getCurrentUser, getCurrentUserProfile } from "@/lib/auth";
import { getUserSettings } from "@/lib/db";
import { getPushPublicKey, isPushConfigured } from "@/lib/push";
import { signOutAction } from "@/app/login/actions";
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
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Noema user";
  const accountDetails = [user?.email, user?.email_confirmed_at ? "Tili aktiivinen" : "Vahvista email"]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="review-shell">
      <div className="page-header">
        <div className="settings-page-heading">
          <div>
            <h1>Asetukset</h1>
            <p className="muted">Hallitse omaa Noemaasi ja sovelluksen asetuksia</p>
          </div>
          {user ? (
            <div className="settings-mobile-account">
              <div className="settings-mobile-account-copy">
                <strong>{displayName}</strong>
                <span>{accountDetails || "Noema user"}</span>
              </div>
              <form action={signOutAction} className="settings-mobile-account-signout">
                <SubmitButton className="secondary" pendingText="Kirjaudutaan ulos...">
                  Kirjaudu ulos
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </div>
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
              <h2 style={{ margin: 0 }}>Käyttäjän tiedot</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Nimi, yhteystieto ja muut tilin perustiedot.
              </p>
            </div>
            <span className="pill" data-variant="primary">
              {user.email_confirmed_at ? "Aktiivinen" : "Vahvistus kesken"}
            </span>
          </div>

          <div className="grid grid-cols-2">
            <div className="form-row">
              <span>Käyttäjän nimi</span>
              <strong>{displayName}</strong>
            </div>
            <div className="form-row">
              <span>Käyttäjän tiedot</span>
              <strong>{user.email || "-"}</strong>
            </div>
          </div>

          <div className="form-row">
            <span>Lisätiedot</span>
            <p className="status" style={{ margin: 0, color: "var(--text)" }}>
              {profile?.motivation || user.user_metadata?.motivation || "Ei muita tallennettuja käyttäjätietoja."}
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
              <h2 style={{ margin: 0 }}>Prompt-ohjaus</h2>
            </div>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Noeman antamien vastausten kieli</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kirjoita kielen nimi alle ja saat Noeman antamat ehdotukset kyseisellä kielellä.
              </p>
            </div>
            <label className="form-row">
              <input
                name="responseLanguage"
                defaultValue={settings.responseLanguage}
                placeholder="Finnish, English, Swedish..."
                required
              />
            </label>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Tunnisteiden luonti ohjaus</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kirjoita haluamasi ohjeistus automaattiselle tunnisteiden luonnille.
              </p>
            </div>
            <label className="form-row">
              <span>Tunnisteiden luonti</span>
              <textarea
                name="tagGenerationPrompt"
                defaultValue={settings.tagGenerationPrompt}
                placeholder="Esim. luo 3-6 lyhyttä, hakukelpoista tunnistetta ilman päällekkäisiä synonyymeja."
              />
            </label>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Tutki tätä lisää ohjaus</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kirjoita haluamasi ohjeistus Tutki tätä lisää -ohjeistuksen toiminnoille.
              </p>
            </div>
            <div className="grid settings-grid">
              <label className="form-row">
                <span>Tutki tätä lisää / kirkasta</span>
                <textarea
                  name="analysisPromptRefresh"
                  defaultValue={settings.analysisPromptRefresh}
                  placeholder="Esim. pidä näkökulma käytännöllisenä ja tuo esiin päätösvaikutus."
                />
              </label>

              <label className="form-row">
                <span>Tutki tätä lisää / syvennä</span>
                <textarea
                  name="analysisPromptDeepen"
                  defaultValue={settings.analysisPromptDeepen}
                  placeholder="Esim. syvennä trade-offit, riskit ja seuraava konkreettinen askel."
                />
              </label>

              <label className="form-row">
                <span>Tutki tätä lisää / tiivistä</span>
                <textarea
                  name="analysisPromptSummarize"
                  defaultValue={settings.analysisPromptSummarize}
                  placeholder="Esim. tiivistä ydinväite, älä menetä toimintaehdotusta."
                />
              </label>
            </div>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Tehtävien luonnin ohjaus</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kirjoita haluamasi ohjeistus luo tehtävät -toiminnoille.
              </p>
            </div>
            <label className="form-row">
              <span>Luo tehtävät</span>
              <textarea
                name="cardGenerationPrompt"
                defaultValue={settings.cardGenerationPrompt}
                placeholder="Esim. tee korteista päätöksentekoa ja soveltamista tukevia."
              />
            </label>
          </div>
        </article>

        <div className="actions settings-form-actions">
          <SubmitButton className="primary" pendingText="Tallennetaan asetuksia...">
            Tallenna asetukset
          </SubmitButton>
        </div>
      </form>

      <NotificationTester pushConfigured={pushConfigured} pushPublicKey={pushPublicKey} />

      <style>{`
        .settings-page-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .settings-mobile-account {
          display: none;
        }

        .settings-mobile-account-copy {
          display: grid;
          gap: 0.15rem;
          text-align: right;
        }

        .settings-mobile-account-copy strong {
          font-size: 0.95rem;
          line-height: 1.2;
          color: var(--text);
        }

        .settings-mobile-account-copy span {
          font-size: 0.78rem;
          line-height: 1.35;
          color: var(--muted);
        }

        .settings-mobile-account-signout {
          margin: 0;
        }

        .settings-subsection + .settings-subsection {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .settings-subsection-copy {
          margin-bottom: 0.85rem;
        }

        .settings-form-actions {
          justify-content: flex-end;
          margin-top: 0.25rem;
        }

        @media (max-width: 760px) {
          .settings-mobile-account {
            display: grid;
            justify-items: end;
            gap: 0.55rem;
            margin-left: auto;
          }

          .settings-mobile-account-copy {
            max-width: 12rem;
          }
        }
      `}</style>
    </section>
  );
}
