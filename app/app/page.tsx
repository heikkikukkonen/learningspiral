import Image from "next/image";
import Link from "next/link";
import { countReviewQueueItems } from "@/lib/db";

const homeActions = [
  {
    title: "Kirjoita ajatus",
    href: "/capture?mode=text",
    accent: "teal",
    iconSrc: "/brand/action-icons/KirjoitaAjatus.PNG"
  },
  {
    title: "Lisää kuva",
    href: "/capture?mode=image",
    accent: "teal",
    iconSrc: "/brand/action-icons/TallennaKuva.PNG"
  },
  {
    title: "Sanele ajatus",
    href: "/capture?mode=voice",
    accent: "deep",
    iconSrc: "/brand/action-icons/Sanele.PNG"
  },
  {
    title: "Syvenny",
    href: "/review",
    accent: "highlight",
    iconSrc: "/brand/action-icons/Syvenna.PNG"
  }
] as const;

export default async function AppHomePage({
  searchParams
}: {
  searchParams?: { captureSaved?: string };
}) {
  const reviewQueueCount = await countReviewQueueItems().catch(() => 0);
  const captureSaved = searchParams?.captureSaved === "1";

  return (
    <section className="home-shell home-shell-mobile">
      <div className="home-phone-card">
        {captureSaved ? (
          <article className="card" style={{ marginBottom: "1rem" }}>
            <p className="status" style={{ margin: 0 }}>
              Ajatus tallennettu. Palaamme tähän myöhemmin.
            </p>
          </article>
        ) : null}
        <div className="home-hero">
          <div className="home-visual home-visual-main" aria-hidden="true" />
          <div className="home-hero-overlay">
            <div className="home-brand">
              <div className="home-brand-mark">
                <Image src="/icon.png" alt="Noema logo" width={300} height={180} priority />
              </div>
              <h1 className="home-brand-title">Noema</h1>
              <p className="home-brand-tagline">
                <span>Where thinking deepens</span>
                <span className="home-brand-tagline-emphasis">and turns into meaningful action</span>
              </p>
            </div>
            <div className="home-list">
              {homeActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="home-list-card"
                  data-accent={action.accent}
                >
                  <span className="home-list-icon" aria-hidden="true">
                    <Image
                      src={action.iconSrc}
                      alt=""
                      aria-hidden="true"
                      width={72}
                      height={72}
                      className="home-list-icon-image"
                    />
                  </span>
                  <span className="home-list-copy">
                    <strong>{action.title}</strong>
                    {action.href === "/review" ? (
                      <span className="home-list-meta">
                        {reviewQueueCount} {reviewQueueCount === 1 ? "asia syvennettävänä" : "asiaa syvennettävänä"}
                      </span>
                    ) : null}
                  </span>
                  <span className="home-list-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
