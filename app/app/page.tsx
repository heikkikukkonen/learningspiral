import Image from "next/image";
import Link from "next/link";
import { countReviewQueueItems } from "@/lib/db";

const homeActions = [
  {
    title: "Kirjoita ajatus",
    href: "/capture?mode=text",
    accent: "teal",
    icon: "pen"
  },
  {
    title: "Lisaa kuva",
    href: "/capture?mode=image",
    accent: "teal",
    icon: "image"
  },
  {
    title: "Sanele ajatus",
    href: "/capture?mode=voice",
    accent: "deep",
    icon: "mic"
  },
  {
    title: "Syvenny",
    href: "/review",
    accent: "highlight",
    icon: "brain"
  }
] as const;

function ActionIcon({ icon }: { icon: (typeof homeActions)[number]["icon"] }) {
  if (icon === "pen") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.8 18.4V20h1.6l10.5-10.5-1.6-1.6L4.8 18.4z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path d="M14.5 6.9l1.6-1.6a1.5 1.5 0 012.1 0l.5.5a1.5 1.5 0 010 2.1l-1.6 1.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M13.7 7.1l3.2 3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }

  if (icon === "image") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8.5" cy="10" r="1.4" fill="currentColor" />
        <path
          d="M6 16l3.8-3.7a1 1 0 011.4 0l2.3 2.3 1.6-1.6a1 1 0 011.4 0L19 15.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (icon === "mic") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="4" width="6" height="9.8" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.7 11.4a5.3 5.3 0 0010.6 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        <path d="M12 16.8v3.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        <path d="M9.4 20h5.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }

  if (icon === "brain") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9.4 6.3a2.9 2.9 0 00-5.2 1.8c0 .6.1 1.1.4 1.6A3.2 3.2 0 004 15.6c.8.8 1.9 1.2 3 1.2h1.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M14.6 6.3a2.9 2.9 0 015.2 1.8c0 .6-.1 1.1-.4 1.6a3.2 3.2 0 01.5 5.9c-.8.8-1.9 1.2-3 1.2h-1.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M12 5.3v13.2M9.2 8.4c.7.5 1.1 1.4 1.1 2.4s-.4 1.9-1.1 2.4m5.6-4.8c-.7.5-1.1 1.4-1.1 2.4s.4 1.9 1.1 2.4M8.8 16c.8-.2 1.5-.1 2.1.2.4.2.7.5 1.1.9m3.2-1.1c-.8-.2-1.5-.1-2.1.2-.4.2-.7.5-1.1.9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  return null;
}

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
              Ajatus tallennettu. Palaamme tahan myohemmin.
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
                    <ActionIcon icon={action.icon} />
                  </span>
                  <span className="home-list-copy">
                    <strong>{action.title}</strong>
                    {action.href === "/review" ? (
                      <span className="home-list-meta">
                        {reviewQueueCount} {reviewQueueCount === 1 ? "asia syvennettavana" : "asiaa syvennettavana"}
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
