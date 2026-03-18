import Link from "next/link";

export function HomeStory() {
  return (
    <Link href="/story" className="home-story-link">
      <span className="home-story-link-copy">
        <span className="home-story-link-kicker">Mika on Noema?</span>
        <strong>Lue visuaalinen tarina ajattelusta, joka syvenee.</strong>
      </span>
      <span className="home-story-link-action">
        <span>Lue tarina</span>
        <span className="home-story-link-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
