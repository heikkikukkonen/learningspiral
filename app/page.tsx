import Link from "next/link";

const homeActions = [
  {
    title: "Kirjoita ajatus",
    subtitle: "Tallenna idea heti tekstina.",
    href: "/capture?mode=text",
    accent: "green",
    icon: "pen"
  },
  {
    title: "Lisaa kuva",
    subtitle: "Anna AI:n tulkita screenshot tai kuva.",
    href: "/capture?mode=image",
    accent: "orange",
    icon: "image"
  },
  {
    title: "Nauhoita sanelu",
    subtitle: "Muuta puhuttu ajatus tekstiksi.",
    href: "/capture?mode=voice",
    accent: "blue",
    icon: "mic"
  },
  {
    title: "Syvenna osaamista",
    subtitle: "Palaa review'hun ja jatka oppimiskierretta.",
    href: "/review",
    accent: "gold",
    icon: "brain"
  }
] as const;

function ActionIcon({ icon }: { icon: (typeof homeActions)[number]["icon"] }) {
  if (icon === "pen") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 16.8V20h3.2L18 9.2l-3.2-3.2L4 16.8z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M13.7 7.1l3.2 3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "image") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
        <path
          d="M6 17l4.2-4.2a1 1 0 011.4 0L14 15l1.7-1.7a1 1 0 011.4 0L19 15"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (icon === "mic") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="4" width="6" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 11.5a5.5 5.5 0 0011 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M12 17v3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M9 20h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "brain") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9.2 6.2a2.9 2.9 0 00-5.4 1.5c0 .6.2 1.2.5 1.7A3.3 3.3 0 004 15.8c.9.8 2 1.2 3.2 1.2h1.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M14.8 6.2a2.9 2.9 0 015.4 1.5c0 .6-.2 1.2-.5 1.7a3.3 3.3 0 01.3 6.4c-.9.8-2 1.2-3.2 1.2h-1.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M12 5.2v13.6M9.2 8.4C10 9 10.4 9.9 10.4 11s-.4 2-1.2 2.6m4.4-5.2c.8.6 1.2 1.5 1.2 2.6s-.4 2-1.2 2.6M8.7 16.3c.8-.2 1.5-.1 2.2.3.3.2.7.5 1.1.9m3.3-1.2c-.8-.2-1.5-.1-2.2.3-.3.2-.7.5-1.1.9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
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
          <div className="home-visual home-visual-main" aria-hidden="true">
            <div className="home-visual-brain" />
            <div className="home-visual-spiral" />
            <div className="home-visual-ring home-visual-ring-a" />
            <div className="home-visual-ring home-visual-ring-b" />
            <div className="home-visual-ring home-visual-ring-c" />
            <div className="home-visual-glow" />
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
