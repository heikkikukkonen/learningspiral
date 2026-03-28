"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeReviewAction } from "@/app/sources/actions";
import { SubmitButton } from "@/app/components/submit-button";
import type { CardAnswerHistoryItem, DueReviewCard, UnrefinedIdeaQueueItem } from "@/lib/db";
import { cardTypeLabel } from "@/lib/types";

type ReviewQueueItem =
  | {
      kind: "review";
      card: DueReviewCard;
      history: CardAnswerHistoryItem[];
    }
  | {
      kind: "idea";
      idea: UnrefinedIdeaQueueItem;
    };

type Props = {
  reviewedToday: number;
  initialItems: ReviewQueueItem[];
};

function buildIdeaPreview(idea: UnrefinedIdeaQueueItem): string {
  const primary = idea.raw_input?.trim() || idea.summary_content?.trim() || "";
  if (!primary) {
    return "Keskeneräinen ajatus odottaa vielä otsikointia ja työstämistä.";
  }

  return primary.length > 280 ? `${primary.slice(0, 277)}...` : primary;
}

function ReviewCard({
  card,
  history,
  currentIndex,
  totalCount,
  onCompleted,
  pending
}: {
  card: DueReviewCard;
  history: CardAnswerHistoryItem[];
  currentIndex: number;
  totalCount: number;
  onCompleted: (formData: FormData) => void;
  pending: boolean;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");

  return (
    <article className="card review-card-shell">
      <div className="review-card-progress">
        <p className="review-card-counter">
          {currentIndex} / {totalCount}
        </p>
      </div>

      <div className="review-card-head">
        <div className="source-meta">
          <span className="pill" data-variant="primary">
            {cardTypeLabel(card.card_type)}
          </span>
          <span className="pill">{card.source_title}</span>
        </div>
        <h2 className="review-card-title">{card.prompt}</h2>
      </div>

      <div className="form review-card-form">
        <label className="form-row">
          <span>Vastauksesi</span>
          <textarea
            name="draftAnswer"
            value={userAnswer}
            onChange={(event) => setUserAnswer(event.target.value)}
            placeholder="Kirjoita oma vastauksesi ennen kuin painat 'Näytä tiedot'."
            required
          />
        </label>

        <div className="actions">
          <button
            type="button"
            className="secondary review-reveal-button"
            onClick={() => setShowAnswer((current) => !current)}
          >
            {showAnswer ? "Piilota tiedot" : "Näytä tiedot"}
          </button>
          <form
            action={(formData) => {
              formData.set("cardId", card.id);
              formData.set("userAnswer", userAnswer);
              formData.set("schedule", "near");
              onCompleted(formData);
            }}
          >
            <SubmitButton
              className="secondary review-reveal-button"
              pendingText="Tallennan..."
              disabled={pending}
            >
              Ohita nyt
            </SubmitButton>
          </form>
        </div>

        {showAnswer ? (
          <div className="list review-card-panels">
            <article className="card review-answer-panel">
              <p className="review-panel-label">Mallivastaus</p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{card.answer}</p>
            </article>

            <article className="card review-answer-panel">
              <p className="review-panel-label">Aiemmat vastauksesi</p>
              {history.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Ei aiempia vastauksia.
                </p>
              ) : (
                <div className="list">
                  {history.map((item, index) => (
                    <article key={`${item.created_at}-${index}`} className="card">
                      <p style={{ marginTop: 0, marginBottom: "0.4rem", whiteSpace: "pre-wrap" }}>
                        {item.user_answer}
                      </p>
                      <p className="status" style={{ marginBottom: 0 }}>
                        {new Date(item.created_at).toLocaleString("fi-FI")}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <details className="card review-answer-panel">
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Avaa tehtävään liittyvä teoria</summary>
              <div style={{ marginTop: "0.7rem" }}>
                <p className="status" style={{ marginTop: 0 }}>
                  Lähde: {card.source_title}
                </p>
                <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {card.summary_content || "Teoriaa ei lÃ¶ytynyt tästä lähteestä vielä."}
                </p>
              </div>
            </details>

            <article className="card review-answer-panel review-schedule-panel">
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                Kuinka vahvasti haluat palata tähän uudelleen?
              </h3>
              <div className="review-schedule-grid">
                <form
                  action={(formData) => {
                    formData.set("cardId", card.id);
                    formData.set("userAnswer", userAnswer);
                    formData.set("schedule", "soon");
                    onCompleted(formData);
                  }}
                >
                  <SubmitButton
                    className="secondary review-schedule-button"
                    pendingText="Tallennan..."
                    disabled={pending || !userAnswer.trim()}
                  >
                    Heti (3min)
                  </SubmitButton>
                </form>
                <form
                  action={(formData) => {
                    formData.set("cardId", card.id);
                    formData.set("userAnswer", userAnswer);
                    formData.set("schedule", "near");
                    onCompleted(formData);
                  }}
                >
                  <SubmitButton
                    className="primary review-schedule-button"
                    pendingText="Tallennan..."
                    disabled={pending || !userAnswer.trim()}
                  >
                    Pidä lähellä (1 päivä)
                  </SubmitButton>
                </form>
                <form
                  action={(formData) => {
                    formData.set("cardId", card.id);
                    formData.set("userAnswer", userAnswer);
                    formData.set("schedule", "later");
                    onCompleted(formData);
                  }}
                >
                  <SubmitButton
                    className="success review-schedule-button"
                    pendingText="Tallennan..."
                    disabled={pending || !userAnswer.trim()}
                  >
                    Palaa myÃ¶hemmin ({">"}10 päivää)
                  </SubmitButton>
                </form>
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function IdeaCard({
  idea,
  currentIndex,
  totalCount,
  onSkip
}: {
  idea: UnrefinedIdeaQueueItem;
  currentIndex: number;
  totalCount: number;
  onSkip: () => void;
}) {
  return (
    <article className="card review-card-shell review-card-shell-idea">
      <div className="review-card-progress">
        <p className="review-card-counter">
          {currentIndex} / {totalCount}
        </p>
      </div>

      <div className="review-card-head">
        <div className="source-meta">
          {idea.tags?.slice(0, 3).map((tag) => (
            <span className="tag-chip tag-chip-network tag-chip-inline" key={tag}>
              <span className="tag-chip-mark" aria-hidden="true">#</span>
              <span>{tag}</span>
            </span>
          ))}
        </div>
        <h2 className="review-card-title">Haluatko työstää tätä ajatusta eteenpäin?</h2>
        <p className="review-card-lead">{buildIdeaPreview(idea)}</p>
      </div>

      <div className="card review-answer-panel">
        <p className="review-panel-label">Miksi tämä on nyt jonossa</p>
        <p style={{ margin: 0 }}>
          Ajatus on tallessa, mutta sitä ei ole vielä työstetty riittävästi eikä muutettu tehtäviksi.
        </p>
      </div>

      <div className="actions review-idea-actions">
        <Link href={`/sources/${idea.id}`} className="button-link primary review-idea-button">
          Työstä nyt
        </Link>
        <button type="button" className="secondary review-idea-button" onClick={onSkip}>
          Jatka myöhemmin
        </button>
      </div>
    </article>
  );
}

export function ReviewQueue({ reviewedToday, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const totalCount = initialItems.length;
  const currentIndex = totalCount - items.length + 1;
  const currentItem = items[0] ?? null;
  const headerLead =
    currentItem?.kind === "review"
      ? "Yksi asia kerrallaan. Yritä vastata ensin tehtävään itse, näytä vasta sitten tiedot."
      : currentItem?.kind === "idea"
        ? "Yksi asia kerrallaan. Nyt on hyvä hetki työstää aiemmin tallentamaasi ajatusta. Lisää siihen puuttuvat tagit ja luo tehtävät niin saat tehtävät automaattisesti nousemaan tälle sivulle."
        : "Yksi asia kerrallaan. Vastaa ensin itse, näytä sitten tiedot tai nosta keskeneräinen ajatus työstettäväksi.";
  const currentStageLabel =
    currentItem?.kind === "review"
      ? "Syvenee noemaksi"
      : currentItem?.kind === "idea"
        ? "Työstössä"
        : null;

  function removeCurrentItem() {
    setItems((current) => current.slice(1));
  }

  function handleReviewCompleted(formData: FormData) {
    setErrorMessage("");

    startTransition(async () => {
      try {
        await completeReviewAction(formData);
        removeCurrentItem();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Tehtavan tallennus epaonnistui. Yrita uudelleen."
        );
      }
    });
  }

  return (
    <>
      <div className="page-header">
        <h1>Syvenny</h1>
        {currentStageLabel ? (
          <div className="source-workspace-status">
            <span className="pill">{currentStageLabel}</span>
          </div>
        ) : null}
        <p className="muted">{headerLead}</p>
      </div>

      {errorMessage ? (
        <article className="card">
          <p className="status" style={{ margin: 0 }}>
            {errorMessage}
          </p>
        </article>
      ) : null}

      {currentItem ? (
        currentItem.kind === "review" ? (
          <ReviewCard
            key={currentItem.card.id}
            card={currentItem.card}
            history={currentItem.history}
            currentIndex={currentIndex}
            totalCount={totalCount}
            onCompleted={handleReviewCompleted}
            pending={isPending}
          />
        ) : (
          <IdeaCard
            key={currentItem.idea.id}
            idea={currentItem.idea}
            currentIndex={currentIndex}
            totalCount={totalCount}
            onSkip={removeCurrentItem}
          />
        )
      ) : (
        <article className="card review-card-shell review-empty-card">
          <p className="review-card-counter" style={{ marginBottom: "0.35rem" }}>
            {totalCount === 0 ? 0 : totalCount} / {totalCount}
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Ei uusia tehtäviä juuri nyt. Voit tallentaa uusia ajatuksia tai syventää olemassa
            olevia ajatuksia.
          </p>
        </article>
      )}
    </>
  );
}
