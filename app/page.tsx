import Link from "next/link";

const homeActions = [
  {
    title: "Kirjoita ajatus",
    subtitle: "Tallenna idea heti tekstina.",
    href: "/capture",
    accent: "green"
  },
  {
    title: "Lisaa kuva",
    subtitle: "Anna AI:n tulkita screenshot tai kuva.",
    href: "/capture",
    accent: "orange"
  },
  {
    title: "Nauhoita sanelu",
    subtitle: "Muuta puhuttu ajatus tekstiksi.",
    href: "/capture",
    accent: "blue"
  },
  {
    title: "Syvenna osaamista",
    subtitle: "Palaa review'hun ja jatka oppimiskierretta.",
    href: "/review",
    accent: "gold"
  }
] as const;

export default function HomePage() {
  return (
    <section className="home-shell">
      <div className="home-visual-card">
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
            <span className="home-list-icon" aria-hidden="true" />
            <span className="home-list-copy">
              <strong>{action.title}</strong>
              <span>{action.subtitle}</span>
            </span>
            <span className="home-list-arrow" aria-hidden="true">
              {">"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
