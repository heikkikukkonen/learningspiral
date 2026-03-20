import {
  type CardAnswerHistoryItem,
  countReviewsCompletedToday,
  listCardAnswerHistoryMap,
  listDueCardsWithContext,
  listUnrefinedIdeas
} from "@/lib/db";
import { ReviewQueue } from "@/app/review/review-queue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  let loadError = "";
  let reviewedToday = 0;

  const [dueCards, ideaQueue] = await Promise.all([
    listDueCardsWithContext().catch((error) => {
      loadError =
        error instanceof Error
          ? error.message
          : "Could not load review cards. Check Supabase configuration.";
      return [];
    }),
    listUnrefinedIdeas().catch((error) => {
      loadError =
        error instanceof Error
          ? error.message
          : "Could not load review cards. Check Supabase configuration.";
      return [];
    })
  ]);

  if (!loadError) {
    reviewedToday = await countReviewsCompletedToday().catch(() => 0);
  }

  const historyByCardId: Record<string, CardAnswerHistoryItem[]> = dueCards.length
    ? await listCardAnswerHistoryMap(dueCards.map((card) => card.id)).catch(
        () => ({}) as Record<string, CardAnswerHistoryItem[]>
      )
    : {};
  const initialItems = [
    ...dueCards.map((card) => ({
      kind: "review" as const,
      card,
      history: historyByCardId[card.id] ?? []
    })),
    ...ideaQueue.map((idea) => ({
      kind: "idea" as const,
      idea
    }))
  ];

  return (
    <section className="review-shell">
      {loadError ? (
        <article className="card">
          <strong>Tietokanta ei ole yhteydessa</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
        </article>
      ) : (
        <ReviewQueue reviewedToday={reviewedToday} initialItems={initialItems} />
      )}
    </section>
  );
}
