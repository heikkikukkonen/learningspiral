import { completeReviewAction } from "@/app/sources/actions";
import { SubmitButton } from "@/app/components/submit-button";
import { listDueCards } from "@/lib/db";
import { CardType } from "@/lib/types";

export const dynamic = "force-dynamic";

type ReviewCard = {
  id: string;
  card_type: CardType;
  status: "suggested" | "active" | "rejected";
  prompt: string;
  answer: string;
};

function cardLabel(cardType: CardType): string {
  if (cardType === "decision") return "decision prompt";
  return cardType;
}

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
        <p className="muted">Due tasks across recall, apply, reflect and decision prompt types.</p>
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
                    {cardLabel(card.card_type)}
                  </span>
                  <span className="pill">{card.status}</span>
                </div>
                <h3 style={{ marginBottom: "0.5rem" }}>{card.prompt}</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {card.answer}
                </p>

                <div className="actions">
                  <form action={completeReviewAction}>
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="rating" value="2" />
                    <SubmitButton className="secondary" pendingText="Saving...">
                      Hard
                    </SubmitButton>
                  </form>
                  <form action={completeReviewAction}>
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="rating" value="3" />
                    <SubmitButton className="primary" pendingText="Saving...">
                      Good
                    </SubmitButton>
                  </form>
                  <form action={completeReviewAction}>
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="rating" value="4" />
                    <SubmitButton className="success" pendingText="Saving...">
                      Easy
                    </SubmitButton>
                  </form>
                </div>
              </article>
            ))}
            {dueCards.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No due cards right now. Accept suggested cards from source details first.
              </p>
            ) : null}
          </div>
        </article>
      )}
    </section>
  );
}
