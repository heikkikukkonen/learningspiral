import Link from "next/link";

const homeActions = [
  {
    title: "Kirjoita ajatus",
    href: "/capture?mode=text",
    accent: "blue",
    icon: "pen"
  },
  {
    title: "Lisaa kuva",
    href: "/capture?mode=image",
    accent: "teal",
    icon: "image"
  },
  {
    title: "Nauhoita sanelu",
    href: "/capture?mode=voice",
    accent: "slate",
    icon: "mic"
  },
  {
    title: "Syvenna osaamista",
    href: "/review",
    accent: "mint",
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

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5l2.2 4.6 5 .7-3.6 3.5.9 4.9-4.5-2.4-4.5 2.4.9-4.9-3.6-3.5 5-.7L12 3.5z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path d="M12 9v3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <circle cx="12" cy="15.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <section className="home-shell home-shell-mobile">
      <div className="home-phone-card">
        <div className="home-hero">
          <div className="home-hero-copy">
            <h1>Learning Spiral</h1>
            <p>Your thinking space</p>
          </div>
          <div className="home-visual home-visual-main" aria-hidden="true">
            <div className="home-visual-mist home-visual-mist-a" />
            <div className="home-visual-mist home-visual-mist-b" />
            <div className="home-visual-brain" />
            <div className="home-visual-links" />
            <div className="home-visual-node home-visual-node-a" />
            <div className="home-visual-node home-visual-node-b" />
            <div className="home-visual-node home-visual-node-c" />
            <div className="home-visual-node home-visual-node-d" />
            <div className="home-visual-node home-visual-node-e" />
            <div className="home-visual-node home-visual-node-f" />
            <div className="home-visual-spiral" />
            <div className="home-visual-ring home-visual-ring-a" />
            <div className="home-visual-ring home-visual-ring-b" />
            <div className="home-visual-ring home-visual-ring-c" />
            <div className="home-visual-glow" />
            <div className="home-visual-dust" />
            <div className="home-visual-sprout">
              <div className="home-visual-sprout-glow" />
              <div className="home-visual-sprout-base" />
              <div className="home-visual-sprout-stem" />
              <div className="home-visual-sprout-leaf home-visual-sprout-leaf-left" />
              <div className="home-visual-sprout-leaf home-visual-sprout-leaf-right" />
            </div>
          </div>
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
    </section>
  );
}
