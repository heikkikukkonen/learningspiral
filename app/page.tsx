import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const storyMoments = [
  {
    eyebrow: "Tallenna",
    title: "Ajatus ei katoa heti, kun saat sen kiinni.",
    body: "Kirjoita, kuvaa tai sanoita hetki talteen silloin kun se on elävä. Noema tekee merkityksellisestä ajatuksesta näkyvän."
  },
  {
    eyebrow: "Palaa",
    title: "Oleellinen ajatus löytää takaisin luoksesi.",
    body: "Sen sijaan että hyvät oivallukset hautautuvat muistiinpanoihin, Noema nostaa ne takaisin harkinnan piiriin oikealla hetkellä."
  },
  {
    eyebrow: "Syvennä",
    title: "Ajatus kasvaa yhteyksien kautta.",
    body: "Kun palaat samaan teemaan uudelleen, ymmärrys kerrostuu. Yksittäinen havainto muuttuu suunnaksi ja toiminnaksi."
  }
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/sources" : "/login?mode=signup&next=%2Fsources";
  const primaryLabel = user ? "Siirry omaan Noemaasi" : "Aloita oma Noemasi";
  const secondaryHref = user ? "/capture?mode=text" : "/login?mode=signin&next=%2Fsources";
  const secondaryLabel = user ? "Tallenna ajatus" : "Kirjaudu";

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-brand">
          <Image src="/icon.png" alt="Noema" width={82} height={48} priority />
          <span>Noema</span>
        </div>

        <div className="landing-hero-copy">
          <h1>Ajattelu, joka syvenee</h1>
          <p className="landing-hero-subtitle">ja muuttuu merkitykselliseksi toiminnaksi</p>
          <p className="landing-hero-lead">Se, mihin et palaa, katoaa.</p>
          <p className="landing-hero-body">
            Noema tuo ajatuksesi takaisin ja vie ne pidemmälle.
          </p>
        </div>

        <div className="landing-flow" aria-hidden="true">
          <svg viewBox="0 0 1200 420" preserveAspectRatio="none">
            <defs>
              <linearGradient id="landingFlowStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(227,247,255,0.25)" />
                <stop offset="18%" stopColor="#dff9ff" />
                <stop offset="50%" stopColor="#9de8f5" />
                <stop offset="82%" stopColor="#b1f7ff" />
                <stop offset="100%" stopColor="#fff4f1" />
              </linearGradient>
              <radialGradient id="landingOrb" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="38%" stopColor="#baf8ff" />
                <stop offset="100%" stopColor="rgba(118, 225, 237, 0.08)" />
              </radialGradient>
            </defs>
            <path
              className="landing-flow-stroke landing-flow-stroke-back"
              d="M104 220C80 126 190 100 302 124C414 148 408 270 536 262C678 252 706 172 838 186C934 196 980 258 1010 282"
            />
            <path
              className="landing-flow-stroke landing-flow-stroke-front"
              d="M106 218C86 136 196 108 302 134C412 162 406 278 538 270C680 262 710 178 842 196C934 208 978 260 1008 284"
            />
            <circle className="landing-flow-node" cx="402" cy="149" r="16" fill="url(#landingOrb)" />
            <circle className="landing-flow-node" cx="724" cy="231" r="18" fill="url(#landingOrb)" />
            <circle className="landing-flow-bloom" cx="1007" cy="282" r="36" fill="url(#landingOrb)" />
            <circle className="landing-flow-orb" cx="1007" cy="282" r="86" fill="url(#landingOrb)" />
          </svg>

          <div className="landing-flow-label landing-flow-label-save">Tallenna</div>
          <div className="landing-flow-label landing-flow-label-return">Palaa</div>
          <div className="landing-flow-label landing-flow-label-deepen">Syvennä</div>
          <div className="landing-flow-label landing-flow-label-action">Merkityksellinen toiminta</div>
        </div>

        <div className="landing-hero-actions">
          <Link href={primaryHref} className="button-link primary landing-primary-cta">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="button-link secondary landing-secondary-cta">
            {secondaryLabel}
          </Link>
        </div>

        <div className="landing-hero-meta">
          {!user ? (
            <Link href="/login?mode=signup&next=%2Fsources" className="landing-inline-link">
              Rekisteröidy
            </Link>
          ) : null}
          <Link href="/story" className="landing-inline-link">
            Lue lisää
          </Link>
        </div>
      </section>

      <section id="scroll-story" className="landing-story">
        <div className="landing-story-intro">
          <span className="pill" data-variant="primary">
            Scroll story
          </span>
          <h2>Ajatus rakentuu kerros kerrokselta.</h2>
          <p>
            Landing jatkaa samaa virtaa kuin kuvassa: ensin löydät ajatuksen, sitten palaat siihen,
            ja lopulta siitä syntyy jotain, joka näkyy toiminnassa.
          </p>
        </div>

        <div className="landing-story-rail" aria-hidden="true" />

        <div className="landing-story-grid">
          {storyMoments.map((moment, index) => (
            <article key={moment.eyebrow} className="landing-story-card">
              <span className="landing-story-index">0{index + 1}</span>
              <span className="landing-story-eyebrow">{moment.eyebrow}</span>
              <h3>{moment.title}</h3>
              <p>{moment.body}</p>
            </article>
          ))}
        </div>

        <article className="landing-story-quote">
          <p>&ldquo;Se, mihin et palaa, katoaa. Noema on tehty tuomaan se takaisin.&rdquo;</p>
        </article>

        <div className="landing-story-footer">
          <div>
            <h3>Haluatko nähdä koko tarinan?</h3>
            <p>
              Varsinainen visuaalinen scroll story on edelleen oma kokemuksensa, jonka kautta voi
              syventyä Noeman ajatukseen rauhassa.
            </p>
          </div>
          <div className="landing-story-actions">
            <Link href="/story" className="button-link secondary">
              Avaa scroll story
            </Link>
            <Link href="/login?mode=signup&next=%2Fsources" className="button-link primary">
              Rekisteröidy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
