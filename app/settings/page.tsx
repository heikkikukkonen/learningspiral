import { SubmitButton } from "@/app/components/submit-button";
import { getCurrentUser, getCurrentUserProfile } from "@/lib/auth";
import { getUserNotificationSettings, getUserSettings, listPushSubscriptions } from "@/lib/db";
import { getPushPublicKey, isPushConfigured } from "@/lib/push";
import { signOutAction } from "@/app/login/actions";
import { saveUserSettingsAction } from "./actions";
import { NotificationSettings } from "./notification-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  const user = await getCurrentUser();
  const profile = await getCurrentUserProfile();
  const settings = await getUserSettings();
  const notificationSettings = await getUserNotificationSettings();
  const saved = searchParams?.saved === "1";
  const pushConfigured = isPushConfigured();
  const pushPublicKey = pushConfigured ? getPushPublicKey() : "";
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Noema user";
  const accountDetails = [user?.email, user?.email_confirmed_at ? "Tili aktiivinen" : "Vahvista email"]
    .filter(Boolean)
    .join(" · ");
  const pushSubscriptions = user ? await listPushSubscriptions() : [];

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

      <form action={saveUserSettingsAction} className="form settings-form">
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

            <label className="form-row">
              <span>Miksi haluat olla osa Noema-tarinaa?</span>
              <textarea
                name="motivation"
                defaultValue={profile?.motivation || user.user_metadata?.motivation || ""}
                placeholder="Kirjoita tähän, mikä kutsuu sinua mukaan Noeman tarinaan."
                rows={4}
              />
            </label>

            {!user.email_confirmed_at ? (
              <p className="status" style={{ margin: 0, color: "var(--danger)" }}>
                Tili aktivoituu vasta, kun sähköpostissa oleva vahvistuslinkki on avattu.
              </p>
            ) : null}
          </article>
        ) : null}

        <article className="card settings-card">
          <div className="settings-section-header">
            <div>
              <h2 style={{ margin: 0 }}>Ajattelun suunta</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Määritä, millaiset kysymykset auttavat sinua syventämään ajatuksiasi ja näkemään asioita
                uudella tavalla.
              </p>
            </div>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Kieli</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Ajattelun kieli
              </p>
            </div>
            <label className="form-row">
              <input
                name="responseLanguage"
                defaultValue={settings.responseLanguage}
                placeholder="Esim. Suomi, English"
                required
              />
            </label>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Tunnisteet</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Miten haluat jäsentää ajatuksiasi? Tunnisteet auttavat ajatuksia löytämään toisensa ja
                muodostamaan yhteyksiä.
              </p>
            </div>
            <label className="form-row">
              <span>Tunnisteet</span>
              <textarea
                name="tagGenerationPrompt"
                defaultValue={settings.tagGenerationPrompt}
                placeholder="Esim. 3–6 selkeää, toisistaan erottuvaa tunnistetta, jotka kuvaavat ajatuksen ydintä."
              />
            </label>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-copy">
              <h3 style={{ margin: 0 }}>Syvennä näkökulmaa</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Millaiset kysymykset auttavat sinua tarkastelemaan ajatusta eri kulmista ja viemään sitä
                eteenpäin?
              </p>
            </div>
            <div className="grid settings-grid">
              <label className="form-row">
                <span>Kirkasta ajattelua</span>
                <textarea
                  name="analysisPromptRefresh"
                  defaultValue={settings.analysisPromptRefresh}
                  placeholder="Esim. pidä näkökulma käytännöllisenä ja tuo esiin päätösvaikutus."
                />
              </label>

              <label className="form-row">
                <span>Syvennä ajattelua</span>
                <textarea
                  name="analysisPromptDeepen"
                  defaultValue={settings.analysisPromptDeepen}
                  placeholder="Esim. syvennä trade-offit, riskit ja seuraava konkreettinen askel."
                />
              </label>

              <label className="form-row">
                <span>Tiivistä</span>
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
              <h3 style={{ margin: 0 }}>Tehtävät</h3>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Kirjoita haluamasi ohjeistus tehtävän luontiin eri tyyppisille tehtäville.
                Nämä ohjeet ohjaavat lähdesivun neljää pikaluontipainiketta.
              </p>
            </div>
            <div className="grid settings-grid">
              <label className="form-row">
                <span>Kertaustehtävä</span>
                <textarea
                  name="recallCardGenerationPrompt"
                  defaultValue={settings.recallCardGenerationPrompt}
                  placeholder="Esim. tee tehtävästä ytimekäs ja auta muistamaan ajatuksen olennaisin kohta."
                />
              </label>

              <label className="form-row">
                <span>Soveltamistehtävä</span>
                <textarea
                  name="applyCardGenerationPrompt"
                  defaultValue={settings.applyCardGenerationPrompt}
                  placeholder="Esim. ohjaa tehtävä soveltamaan ajatusta seuraavassa oikeassa tilanteessa."
                />
              </label>

              <label className="form-row">
                <span>Reflektiotehtävä</span>
                <textarea
                  name="reflectCardGenerationPrompt"
                  defaultValue={settings.reflectCardGenerationPrompt}
                  placeholder="Esim. auta tehtävää pysähtymään oman ajattelun, oletusten tai tunteiden äärelle."
                />
              </label>

              <label className="form-row">
                <span>Keskustelutehtävä</span>
                <textarea
                  name="discussCardGenerationPrompt"
                  defaultValue={settings.discussCardGenerationPrompt}
                  placeholder="Luo tehtävä joka kannustaa minua löytämään jonkun ystävän tai asiantuntijan kenen kanssa voisin keskustella aiheesta syventääkseni ymmärrystä asiasta."
                />
              </label>
            </div>
          </div>
        </article>

        <NotificationSettings
          pushConfigured={pushConfigured}
          pushPublicKey={pushPublicKey}
          initialSettings={notificationSettings}
          initialDevices={pushSubscriptions}
        />

        <div className="actions settings-form-actions">
          <SubmitButton className="primary" pendingText="Tallennetaan asetuksia...">
            Tallenna asetukset
          </SubmitButton>
        </div>
      </form>

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
