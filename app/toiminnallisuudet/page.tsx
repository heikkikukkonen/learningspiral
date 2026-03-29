import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NoemaLoader } from "@/app/components/noema-loader";

export const metadata: Metadata = {
  title: "Noeman toiminnallisuudet",
  description:
    "Tutustu Noeman eri toimintoihin, työnkulkuun ja siihen, miten ajatus kulkee tallennuksesta syventämiseen."
};

const processSteps = [
  {
    number: "1",
    title: "Tallenna nopeasti",
    description:
      "Kirjoita, kuvaa tai sanele hetki talteen silloin kun ajatus on vielä tuore. Tarkoitus on tehdä aloituksesta kevyt, nopea ja helppo."
  },
  {
    number: "2",
    title: "Työstä ajatusta",
    description:
      "Ajatus nousee automaattisesti työstettäväksi. Voit kirkastaa ydintä, lisätä tunnisteita, tehdä linkkejä ja muuttaa ajatuksen tehtäviksi."
  },
  {
    number: "3",
    title: "Syvenny ja toimi",
    description:
      "Luodut tehtävät nousevat Syvenny-näkymään, jossa palaat ajatukseen, harjoittelet, sovellat ja viet oivalluksen käytäntöön."
  }
];

const sections = [
  {
    title: "Tallennus",
    icon: "/brand/action-icons/KirjoitaAjatus.PNG",
    accentClassName: "features-section-save",
    lead:
      "Noeman ensimmäinen tehtävä on tehdä ajatuksen talteen ottamisesta mahdollisimman vaivatonta. Kun alku on kevyt, tärkeät asiat eivät katoa.",
    bullets: [
      "Kirjoita ajatus heti ylös ilman että sinun tarvitsee jäsentää sitä valmiiksi.",
      "Sanele silloin kun puhuminen on nopeampaa kuin kirjoittaminen.",
      "Tallenna kuva, kun oivallus liittyy näkymään, muistiinpanoon, kirjaan tai tilanteeseen.",
      "Kolme moodia palvelevat samaa tavoitetta: nopea, helppo ja matalan kynnyksen tallennus."
    ]
  },
  {
    title: "Selaa ajatuksia",
    icon: "/brand/action-icons/SelaaAjatuksia.PNG",
    accentClassName: "features-section-browse",
    lead:
      "Tallennettu ei jää irralliseksi. Selaa ajatuksia -näkymä auttaa näkemään, mitä olet jo kerännyt, mihin teemoihin palaat ja mitä kannattaisi nostaa uudelleen esiin.",
    bullets: [
      "Ajatukset näkyvät yhtenä selattavana kokonaisuutena.",
      "Tunnisteet auttavat huomaamaan yhteyksiä eri ajatusten välillä.",
      "Hakutoiminnot tekevät myöhemmästä löytämisestä nopeaa ja luontevaa.",
      "Selaus ei ole vain arkisto, vaan tapa huomata toistuvia aiheita ja rakentuvaa ajattelun verkkoa."
    ]
  },
  {
    title: "Työstä ajatusta",
    icon: "/brand/action-icons/Syvenna.PNG",
    accentClassName: "features-section-deepen",
    lead:
      "Kun ajatus on tallessa, sitä voi alkaa jalostaa. Työstä ajatusta -näkymässä raakamuistosta syntyy ymmärretty, nimetty ja linkittyvä osa omaa ajattelua.",
    bullets: [
      "Kirkasta ajatuksen ydin ja kirjoita auki, miksi se on merkityksellinen.",
      "Lisää tunnisteita, jotta ajatus löytää yhteyden muihin ajatuksiin.",
      "Käytä syventäviä toimintoja eri näkökulmien avaamiseen ja jatkoajattelun tukemiseen.",
      "Luo tehtäviä suoraan ajatuksesta, jotta tärkeä asia ei jää vain kiinnostavaksi ajatukseksi."
    ]
  },
  {
    title: "Syvenny",
    icon: "/brand/action-icons/Syvenna.PNG",
    accentClassName: "features-section-review",
    lead:
      "Syvenny-näkymä on paikka, jossa ajatuksista tulee osa toimintaa ja muistia. Sinne nousevat tehtävät sekä myös keskeneräiset ajatukset, jotka kaipaavat jatkotyöstöä.",
    bullets: [
      "Tee tehtäviä yksi asia kerrallaan rauhallisessa rytmissä.",
      "Palaa ajatuksiin oikealla hetkellä sen sijaan, että kaikki jäisi muistamisen varaan.",
      "Harjoittele, sovella, reflektoi ja keskustele ajatuksen ympärillä eri tehtävätyyppien avulla.",
      "Syvenny tukee sekä oppimista että sitä, että hyvä ajatus muuttuu hyväksi teoksi."
    ]
  }
];

const taskModes = [
  {
    title: "Kertaustehtävä",
    description: "Vahvistaa muistia ja auttaa palauttamaan tärkeän asian mieleen omin sanoin."
  },
  {
    title: "Soveltamistehtävä",
    description: "Vie ajatuksen käytäntöön ja kysyy, miten tämä näkyy oikeassa elämässä tai työssä."
  },
  {
    title: "Reflektiotehtävä",
    description: "Avaa henkilökohtaista merkitystä, sisäistä liikettä ja sitä, mitä ajatus sinussa herättää."
  },
  {
    title: "Keskustelutehtävä",
    description: "Auttaa viemään oivalluksen vuorovaikutukseen, jakamiseen ja yhteiseen ajatteluun."
  },
  {
    title: "Vapaa tehtävä",
    description:
      "Käyttäjän itse ohjattava tehtävä, jossa voit pyytää juuri haluamasi tyyppisen tehtävän ajatuksen pohjalta."
  }
];

const perspectiveModes = [
  {
    title: "Tarkenna",
    description:
      "Auttaa kirkastamaan, mitä ajatus oikeastaan tarkoittaa ja mikä siinä on kaikkein olennaisinta."
  },
  {
    title: "Laajenna",
    description:
      "Avaa uusia yhteyksiä, suuntia ja mahdollisuuksia, joita alkuperäinen ajatus voi synnyttää."
  },
  {
    title: "Haasta",
    description:
      "Tuo mukaan vastakysymyksiä, vaihtoehtoisia tulkintoja ja rajoja, jotta ajattelu ei jää liian kapeaksi."
  },
  {
    title: "Sovella",
    description:
      "Kysyy, miten ajatus voisi näkyä käytännössä, arjessa, työssä tai omissa valinnoissasi."
  },
  {
    title: "Vapaa näkökulma",
    description:
      "Käyttäjän itse ohjattava näkökulma, jossa voit pyytää juuri haluamasi tyyppistä tarkastelua."
  }
];

const settingsGuides = [
  {
    title: "Tehtävien luonnin ohjeistus",
    description:
      "Voit muokata asetuksista eri tehtävätyyppien ohjeistusta, myös vapaasti luotavan tehtävän ohjeistusta ja sisältöä."
  },
  {
    title: "Näkökulmien ohjeistus",
    description:
      "Voit muokata asetuksista neljän vakiotyyppisen näkökulman ohjeistusta sekä vapaan näkökulman ohjeistusta ja sisältöä, jotta Noema tukee omaa tapaasi ajatella."
  },
  {
    title: "Tunnisteiden luonti",
    description:
      "Voit ohjata asetuksista tunnisteiden muodostumista, jotta ajatukset linkittyvät toisiinsa juuri sellaisilla teemoilla ja käsitteillä kuin haluat."
  }
];

export default function FeaturesPage() {
  return (
    <section className="features-page">
      <div className="page-header features-hero">
        <div className="features-hero-copy">
          <div className="page-title-with-icon">
            <Image
              src="/brand/noema-logo/noema-logo-source.png"
              alt="Noema logo"
              width={96}
              height={96}
              className="features-hero-logo"
            />
            <h1>Noeman toiminnallisuudet</h1>
          </div>
          <p className="features-eyebrow">
            Ajatuksesta näkyväksi. Näkyvästä työstettäväksi. Työstetystä toiminnaksi.
          </p>
          <p className="muted features-lead">
            Tämä sivu kokoaa yhteen Noeman tärkeimmät toiminnallisuudet ja näyttää, miten yksi
            ajatus kulkee tallennuksesta syventämiseen, tehtäviin ja käytännön tekoihin.
          </p>
        </div>

        <div className="card features-hero-panel">
          <p className="features-panel-label">Noeman ydin</p>
          <p className="features-panel-text">
            Noema auttaa ottamaan merkityksellisen ajatuksen nopeasti talteen, jalostamaan sitä
            rauhassa ja palaamaan siihen silloin kun on oikea hetki syventyä tai toimia.
          </p>
          <div className="actions">
            <Link href="/app" className="button-link primary">
              Aloita tallennus
            </Link>
            <Link href="/settings" className="button-link secondary">
              Takaisin asetuksiin
            </Link>
          </div>
        </div>
      </div>

      <section className="card features-process">
        <div className="features-section-heading">
          <p className="features-kicker">Prosessi</p>
          <h2>Ajatuksen matka Noemassa</h2>
          <p className="muted">
            Noema ei ole vain paikka tallentaa asioita, vaan virta, jossa yksi ajatus saa
            seuraavan luonnollisen askeleen.
          </p>
        </div>

        <div className="features-process-grid">
          {processSteps.map((step) => (
            <article key={step.number} className="features-process-step">
              <span className="features-process-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="features-sections">
        {sections.map((section) => (
          <article key={section.title} className={`card features-section ${section.accentClassName}`}>
            <div className="features-section-header">
              <div className="page-title-with-icon page-title-with-icon-compact">
                <Image
                  src={section.icon}
                  alt=""
                  aria-hidden="true"
                  width={56}
                  height={56}
                  className="page-title-icon"
                />
                <div>
                  <h2>{section.title}</h2>
                  <p className="muted">{section.lead}</p>
                </div>
              </div>
            </div>

            <div className="features-bullet-grid">
              {section.bullets.map((bullet) => (
                <div key={bullet} className="features-bullet">
                  <span className="features-bullet-mark" aria-hidden="true">
                    +
                  </span>
                  <p>{bullet}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="card features-task-modes">
        <div className="features-section-heading">
          <p className="features-kicker">Tehtävätyypit</p>
          <h2>Miten Noema auttaa syventämään?</h2>
          <p className="muted">
            Tehtävät eivät ole irrallinen lisä, vaan tapa tehdä ajatuksesta muistettava,
            sovellettava ja elettävä.
          </p>
        </div>

        <div className="features-task-grid">
          {taskModes.map((mode) => (
            <article key={mode.title} className="features-task-card">
              <div className="features-card-head features-card-head-end">
                <span className="pill" data-variant="primary">
                  Syvenny
                </span>
              </div>
              <h3>{mode.title}</h3>
              <p>{mode.description}</p>
            </article>
          ))}
        </div>

        <p className="muted features-settings-note">
          Voit muokata tehtävien luonnin ohjeistusta Asetukset-sivulla. Sama koskee myös vapaasti
          luotavaa tehtävää, joten myös sen ohjeistus, sisältö ja painotus voidaan sovittaa juuri
          omaan tapaasi oppia ja toimia.
        </p>
      </section>

      <section className="card features-task-modes">
        <div className="features-section-heading">
          <p className="features-kicker">Näkökulmat</p>
          <h2>Miten Noema auttaa katsomaan samaa ajatusta eri suunnista?</h2>
          <p className="muted">
            Syventävät näkökulmat auttavat siirtymään yhdestä raakakirjauksesta kohti
            monipuolisempaa ymmärrystä.
          </p>
        </div>

        <div className="features-task-grid">
          {perspectiveModes.map((mode) => (
            <article key={mode.title} className="features-task-card">
              <div className="features-card-head features-card-head-end">
                <span className="pill" data-variant="primary">
                  Työstä ajatusta
                </span>
              </div>
              <h3>{mode.title}</h3>
              <p>{mode.description}</p>
            </article>
          ))}
        </div>

        <p className="muted features-settings-note">
          Myös näkökulmien ohjeistusta voi muokata Asetukset-sivulla. Noeman neljä vakiotyyppiä
          sekä vapaa näkökulma voidaan siis ohjata tukemaan juuri sinun ajattelutapaasi.
        </p>
      </section>

      <section className="card features-task-modes">
        <div className="features-section-heading">
          <p className="features-kicker">Ohjattavuus</p>
          <h2>Mitä voit säätää asetuksista?</h2>
          <p className="muted">
            Noema ei pakota yhtä tapaa ajatella, vaan antaa mahdollisuuden ohjata miten tehtävät,
            näkökulmat ja tunnisteet rakentuvat.
          </p>
        </div>

        <div className="features-task-grid">
          {settingsGuides.map((item) => (
            <article key={item.title} className="features-task-card">
              <div className="features-card-head features-card-head-end">
                <span className="pill">{item.title}</span>
              </div>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card features-closing">
        <div className="features-section-heading">
          <p className="features-kicker">Miksi tämä kokonaisuus on olemassa?</p>
          <h2>Ajatusten keräämisestä hyvään elämään</h2>
        </div>
        <p className="muted features-closing-copy">
          Noeman tarkoitus on auttaa sinua tallentamaan olennaista, syventämään ymmärrystä,
          linkittämään ajatuksia toisiinsa ja viemään parhaat oivallukset konkreettisiksi teoiksi.
          Kun hyvä ajatus ei jää vain hetkelliseksi, siitä voi tulla suunta, tapa tai hyvä teko.
        </p>

        <div className="features-closing-stack">
          <section className="features-closing-subsection features-philosophy-box">
            <div className="features-section-heading">
              <div className="features-philosophy-brand">
                <Image
                  src="/brand/noema-logo/noema-logo-exact.svg"
                  alt="Noema logo"
                  width={168}
                  height={44}
                  className="features-philosophy-logo"
                />
              </div>
              <p className="features-kicker">Nimen tausta</p>
              <h3>Mikä on Noema?</h3>
            </div>
            <p className="muted features-closing-copy">
              Sana <strong>Noema</strong> tulee filosofiasta (fenomenologiasta) ja tarkoittaa sitä
              ymmärrystä, jonka muodostat siitä, mitä koet.
            </p>
            <p className="muted features-closing-copy">
              Sama tilanne voi johtaa eri lopputuloksiin, ei siksi, että maailma olisi erilainen,
              vaan siksi, että ajattelet siitä eri tavalla.
            </p>
            <p className="muted features-closing-copy">Tämä tulkinta, merkitys ja suunta on Noema.</p>
            <p className="muted features-closing-copy">
              Noema-sovellus auttaa sinua kehittämään tätä: palaamaan ajatuksiisi, yhdistämään niitä
              ja syventämään ymmärrystäsi ajan myötä.
            </p>
            <p className="muted features-closing-copy">
              Niin, että ajattelusi ei jää hetkelliseksi vaan muuttuu tavaksi nähdä ja toimia.
            </p>
          </section>

          <section className="features-closing-subsection features-loader-meaning">
            <div className="features-section-heading">
              <p className="features-kicker">Noeman rakentuminen</p>
              <h3>Ajattelu liikkeessä</h3>
              <p className="muted">
                Vasemman puolen pyörivä liike kuvaa Noeman rakentumista: ajatuksen palaamista,
                yhdistymistä ja syvenemistä. Oikean puolen kirkastuva piste kuvaa niitä hyviä
                toimintoja ja tekoja, joihin ymmärrys voi johtaa.
              </p>
            </div>

            <div className="features-loader-stage">
              <div className="features-loader-rail features-loader-rail-left" aria-hidden="true">
                <span>tallenna</span>
                <span>palaa</span>
                <span>yhdistä</span>
                <span>syvennä</span>
              </div>

              <div className="features-loader-shell">
                <NoemaLoader
                  variant="panel"
                  size={300}
                  label="Noeman rakentuminen"
                  detail="Ajatus muotoutuu vähitellen ymmärrykseksi ja toiminnaksi."
                />
              </div>

              <div className="features-loader-rail features-loader-rail-right" aria-hidden="true">
                <span>ymmärrä</span>
                <span>oivalla</span>
                <span>suuntaa</span>
                <span>tee hyvää</span>
              </div>
            </div>
          </section>
        </div>
      </section>

      <style>{`
        .features-page {
          display: grid;
          gap: 1rem;
          padding: 1rem 0 2rem;
        }

        .features-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 0.95fr);
          gap: 1rem;
          align-items: stretch;
        }

        .features-hero-copy,
        .features-section-heading {
          display: grid;
          gap: 0.65rem;
        }

        .features-eyebrow {
          margin: 0;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #3c8393;
        }

        .features-hero-logo {
          width: clamp(2.8rem, 6vw, 4.1rem);
          height: clamp(2.8rem, 6vw, 4.1rem);
          display: block;
          flex: 0 0 auto;
          object-fit: contain;
        }

        .features-lead,
        .features-section-heading p,
        .features-closing-copy {
          margin: 0;
          max-width: 72ch;
          line-height: 1.65;
        }

        .features-hero-panel,
        .features-process,
        .features-section,
        .features-task-modes,
        .features-closing {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(214, 222, 233, 0.96);
          box-shadow: 0 18px 38px rgba(186, 199, 216, 0.14);
        }

        .features-hero-panel {
          display: grid;
          align-content: start;
          gap: 0.8rem;
          padding: 1.2rem;
          background:
            radial-gradient(circle at 88% 18%, rgba(126, 224, 228, 0.26) 0%, rgba(255, 255, 255, 0) 26%),
            radial-gradient(circle at 14% 88%, rgba(255, 210, 120, 0.22) 0%, rgba(255, 255, 255, 0) 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 255, 0.98));
        }

        .features-panel-label,
        .features-kicker {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6f84a0;
        }

        .features-panel-text,
        .features-process-step p,
        .features-bullet p,
        .features-task-card p {
          margin: 0;
          line-height: 1.6;
          color: #50657d;
        }

        .features-process,
        .features-task-modes,
        .features-closing {
          padding: 1.25rem;
          background:
            radial-gradient(circle at 92% 14%, rgba(197, 232, 255, 0.24) 0%, rgba(255, 255, 255, 0) 24%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(247, 250, 255, 0.98));
        }

        .features-closing-stack {
          display: grid;
          gap: 1rem;
          margin-top: 1.1rem;
        }

        .features-closing-subsection {
          padding: 1.25rem;
          border-radius: 26px;
          background:
            radial-gradient(circle at 92% 14%, rgba(197, 232, 255, 0.2) 0%, rgba(255, 255, 255, 0) 24%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 255, 0.96));
        }

        .features-philosophy-box {
          border: 1px dashed rgba(121, 157, 199, 0.52);
          background:
            radial-gradient(circle at 86% 18%, rgba(193, 213, 255, 0.22) 0%, rgba(255, 255, 255, 0) 24%),
            radial-gradient(circle at 10% 90%, rgba(255, 219, 154, 0.18) 0%, rgba(255, 255, 255, 0) 28%),
            linear-gradient(180deg, rgba(250, 251, 255, 0.98), rgba(245, 248, 255, 0.98));
        }

        .features-philosophy-brand {
          display: flex;
          align-items: center;
        }

        .features-philosophy-logo {
          width: auto;
          height: 2rem;
        }

        .features-loader-meaning {
          display: grid;
          gap: 1rem;
          overflow: hidden;
          border: 1px solid rgba(214, 222, 233, 0.96);
        }

        .features-loader-stage {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0 0.25rem;
        }

        .features-loader-shell {
          display: grid;
          justify-items: center;
        }

        .features-loader-rail {
          display: grid;
          gap: 0.75rem;
          align-content: center;
        }

        .features-loader-rail span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-height: 2.2rem;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          border: 1px solid rgba(193, 207, 225, 0.92);
          background: rgba(255, 255, 255, 0.84);
          color: #526982;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.82),
            0 10px 20px rgba(190, 202, 218, 0.14);
        }

        .features-loader-rail-left {
          justify-items: end;
        }

        .features-loader-rail-left span:nth-child(1) {
          margin-right: 1.8rem;
        }

        .features-loader-rail-left span:nth-child(2) {
          margin-right: 0.8rem;
        }

        .features-loader-rail-left span:nth-child(3) {
          margin-right: 1.2rem;
        }

        .features-loader-rail-left span:nth-child(4) {
          margin-right: 2rem;
        }

        .features-loader-rail-right {
          justify-items: start;
        }

        .features-loader-rail-right span:nth-child(1) {
          margin-left: 2rem;
        }

        .features-loader-rail-right span:nth-child(2) {
          margin-left: 0.9rem;
        }

        .features-loader-rail-right span:nth-child(3) {
          margin-left: 1.3rem;
        }

        .features-loader-rail-right span:nth-child(4) {
          margin-left: 2.1rem;
        }

        .features-process-grid,
        .features-bullet-grid,
        .features-task-grid {
          display: grid;
          gap: 0.9rem;
        }

        .features-process-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 1rem;
        }

        .features-process-step {
          display: grid;
          gap: 0.55rem;
          padding: 1rem;
          border-radius: 22px;
          border: 1px solid rgba(213, 221, 233, 0.98);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 248, 255, 0.9));
        }

        .features-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.7rem;
          flex-wrap: wrap;
        }

        .features-card-head-end {
          justify-content: flex-end;
        }

        .features-process-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #52bad9, #9ee8e9);
          color: #fff;
          font-weight: 800;
          box-shadow: 0 10px 22px rgba(82, 186, 217, 0.24);
        }

        .features-process-step h3,
        .features-task-card h3,
        .features-section h2,
        .features-closing h2,
        .features-closing h3,
        .features-process h2,
        .features-task-modes h2 {
          margin: 0;
        }

        .features-sections {
          display: grid;
          gap: 1rem;
        }

        .features-section {
          display: grid;
          gap: 1rem;
          padding: 1.2rem;
          background:
            radial-gradient(circle at 95% 12%, rgba(188, 227, 255, 0.18) 0%, rgba(255, 255, 255, 0) 22%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98));
        }

        .features-section-save {
          border-color: rgba(148, 207, 233, 0.9);
        }

        .features-section-browse {
          border-color: rgba(113, 214, 213, 0.74);
        }

        .features-section-deepen {
          border-color: rgba(148, 205, 140, 0.9);
        }

        .features-section-review {
          border-color: rgba(160, 213, 165, 0.9);
        }

        .features-section-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .features-section-header p {
          margin: 0.35rem 0 0;
          max-width: 72ch;
          line-height: 1.6;
        }

        .features-bullet-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .features-bullet,
        .features-task-card {
          display: grid;
          gap: 0.5rem;
          padding: 0.95rem 1rem;
          border-radius: 22px;
          border: 1px solid rgba(215, 223, 233, 0.95);
          background: rgba(255, 255, 255, 0.78);
        }

        .features-bullet {
          grid-template-columns: auto 1fr;
          align-items: start;
        }

        .features-bullet-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.6rem;
          height: 1.6rem;
          border-radius: 999px;
          background: rgba(74, 178, 200, 0.12);
          color: #2d7f94;
          font-weight: 800;
        }

        .features-task-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 1rem;
        }

        .features-task-card {
          align-content: start;
        }

        .features-settings-note {
          margin: 1rem 0 0;
          max-width: 72ch;
          line-height: 1.65;
        }

        @media (max-width: 900px) {
          .features-hero,
          .features-process-grid,
          .features-bullet-grid,
          .features-task-grid {
            grid-template-columns: 1fr;
          }

          .features-loader-stage {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .features-loader-rail {
            width: 100%;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            justify-items: center;
          }

          .features-loader-rail-left,
          .features-loader-rail-right {
            justify-items: center;
          }

          .features-loader-rail-left span,
          .features-loader-rail-right span {
            margin: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
