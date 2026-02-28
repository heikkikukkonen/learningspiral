import { listDueCards } from "@/lib/db";
import { CardType } from "@/lib/types";

type ReviewCard = {
  id: string;
  card_type: CardType;
  status: "suggested" | "active" | "rejected";
  prompt: string;
  answer: string;
};

export default async function ReviewPage() {
  let dueCards: ReviewCard[] = [];
  let loadError = "";

  try {
    dueCards = await listDueCards();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load review cards. Check Supabase configuration.";
  }

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Daily Review</h1>
        <p className="muted">Ensimmainen kanta-versio: listaa due-kortit tietokannasta.</p>
      </div>

      {loadError ? (
        <article className="card">
          <strong>Database not connected</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
        </article>
      ) : (
        <article className="card">
          <p className="status" style={{ marginTop: 0 }}>
            Due cards: {dueCards.length}
          </p>
          <div className="list">
            {dueCards.map((card) => (
              <article key={card.id} className="card">
                <div className="source-meta">
                  <span className="pill" data-variant="primary">
                    {card.card_type}
                  </span>
                  <span className="pill">{card.status}</span>
                </div>
                <h3 style={{ marginBottom: "0.5rem" }}>{card.prompt}</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {card.answer}
                </p>
              </article>
            ))}
            {dueCards.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Ei due-kortteja juuri nyt. Hyvaksy ensin suggested-kortteja lahdesivulta.
              </p>
            ) : null}
          </div>
        </article>
      )}
    </section>
  );
}
