import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid" style={{ gap: "1.2rem" }}>
      <div className="page-header">
        <h1>LearningSpiral MVP 0.2</h1>
        <p className="muted">
          Capture chat, summary curation, AI task suggestions, daily review and progress curve.
        </p>
      </div>

      <article className="card">
        <h2 style={{ marginTop: 0 }}>Start</h2>
        <div className="actions">
          <Link className="button-link primary" href="/capture">
            Open Capture
          </Link>
          <Link className="button-link secondary" href="/sources">
            Open Sources
          </Link>
          <Link className="button-link secondary" href="/review">
            Open Daily Review
          </Link>
          <Link className="button-link secondary" href="/progress">
            Open Progress
          </Link>
        </div>
      </article>
    </section>
  );
}
