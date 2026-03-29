import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getUserSettings } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ajatusverkko",
  description: "Beta-näkymä ajatusten välisten yhteyksien tutkimiseen"
};

export default async function ThoughtNetworkPage() {
  const settings = await getUserSettings();

  if (!settings.showBetaFeatures) {
    return (
      <section>
        <div className="page-header">
          <div className="page-title-with-icon">
            <Image
              src="/brand/action-icons/SelaaAjatuksia.PNG"
              alt=""
              aria-hidden="true"
              width={64}
              height={64}
              className="page-title-icon"
            />
            <h1>Ajatusverkko</h1>
          </div>
          <p className="muted">Toiminto avautuu, kun sallit beta-toiminnot asetuksissa.</p>
        </div>

        <article className="card">
          <p className="muted" style={{ marginTop: 0 }}>
            Ajatusverkko on vielä kokeellinen näkymä. Laita asetus päälle, niin lisään sen päävalikkoon ja saat
            tämän beta-sivun käyttöösi.
          </p>
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <Link href="/settings" className="button-link secondary">
              Avaa asetukset
            </Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="review-shell">
      <div className="page-header">
        <div className="page-title-with-icon">
          <Image
            src="/brand/action-icons/SelaaAjatuksia.PNG"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="page-title-icon"
          />
          <h1>Ajatusverkko</h1>
        </div>
        <p className="muted">Beta-pohja ajatusten välisten yhteyksien tutkimiseen.</p>
      </div>

      <div className="list">
        <article className="card">
          <span className="pill" data-variant="primary">
            Beta
          </span>
          <h2 style={{ margin: "0.9rem 0 0.5rem" }}>Pohja on valmis</h2>
          <p className="muted" style={{ margin: 0 }}>
            Tänne voidaan seuraavaksi rakentaa varsinainen Ajatusverkko-näkymä, yhteyslogiikka ja vuorovaikutus.
          </p>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Seuraavaksi tähän voidaan lisätä</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Ajatussolmut, tunnisteiden kautta syntyvät yhteydet, suodattimet ja avauspolut yksittäisiin ajatuksiin.
          </p>
        </article>
      </div>
    </section>
  );
}
