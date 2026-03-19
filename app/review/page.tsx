import {
  countReviewsCompletedToday,
  listCardAnswerHistory,
  listDueCardsWithContext
} from "@/lib/db";
import { ReviewSessionCard } from "@/app/review/review-session-card";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  let loadError = "";
  let reviewedToday = 0;
  let dueCards = await listDueCardsWithContext().catch((error) => {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load review cards. Check Supabase configuration.";
    return [];
  });

  if (!loadError) {
    reviewedToday = await countReviewsCompletedToday().catch(() => 0);
  }

  const currentCard = dueCards[0] ?? null;
  const history = currentCard
    ? await listCardAnswerHistory(currentCard.id).catch(() => [])
    : [];
  const remainingCount = dueCards.length;
  const totalTodayCount = reviewedToday + remainingCount;

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Vahvista Noemaasi</h1>
        <p className="muted">Yksi asia kerrallaan. Vastaa ensin itse, tarkista sitten suunta ja jatka eteenpäin.</p>
      </div>

      {loadError ? (
        <article className="card">
          <strong>Tietokanta ei ole yhteydessä</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
        </article>
      ) : currentCard ? (
        <ReviewSessionCard
          card={currentCard}
          history={history}
          remainingCount={remainingCount}
          totalTodayCount={totalTodayCount}
        />
      ) : (
        <article className="card">
          <p className="status" style={{ margin: 0 }}>
            0 / {totalTodayCount} tehtävää tänään
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Ei uusia ajatuksia juuri nyt. Voit ensin hyväksyä ehdotettuja kortteja idean jalostusnäkymässä.
          </p>
        </article>
      )}
    </section>
  );
}
