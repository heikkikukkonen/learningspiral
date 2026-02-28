import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid" style={{ gap: "1.2rem" }}>
      <div className="page-header">
        <h1>LearningSpiral MVP 0.1</h1>
        <p className="muted">
          Ensimmäinen käyttöliittymäversio flowlle: source - summary - cards -
          daily review.
        </p>
      </div>

      <article className="card">
        <h2 style={{ marginTop: 0 }}>Aloita täältä</h2>
        <div className="actions">
          <Link className="button-link primary" href="/sources">
            Avaa Sources
          </Link>
          <Link className="button-link secondary" href="/review">
            Avaa Daily Review
          </Link>
        </div>
      </article>
    </section>
  );
}
