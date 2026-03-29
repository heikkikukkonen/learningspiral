"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { completeReviewAction, scheduleIdeaReviewAction } from "@/app/sources/actions";
import { SubmitButton } from "@/app/components/submit-button";
import type { CardAnswerHistoryItem, DueReviewCard, UnrefinedIdeaQueueItem } from "@/lib/db";
import { parseSourceSummaryContent } from "@/lib/source-editor";
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
  initialItems: ReviewQueueItem[];
};

type ThoughtDetails = {
  title: string;
  tags: string[];
  idea: string;
  analysis: string;
};

const IDEA_SNOOZE_STORAGE_KEY = "review_idea_snoozes_v1";

function queueLabel(count: number) {
  return `${count} ${count === 1 ? "asia" : "asiaa"} syvennettävänä`;
}

function readIdeaSnoozes(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(IDEA_SNOOZE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeIdeaSnoozes(value: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDEA_SNOOZE_STORAGE_KEY, JSON.stringify(value));
}

function filterVisibleItems(items: ReviewQueueItem[]): ReviewQueueItem[] {
  const snoozes = readIdeaSnoozes();
  const nowIso = new Date().toISOString();
  let changed = false;

  const visibleItems = items.filter((item) => {
    if (item.kind !== "idea") return true;
    const snoozedUntil = snoozes[item.idea.id];
    if (!snoozedUntil) return true;
    if (snoozedUntil > nowIso) return false;
    delete snoozes[item.idea.id];
    changed = true;
    return true;
  });

  if (changed) {
    writeIdeaSnoozes(snoozes);
  }

  return visibleItems;
}

function storeIdeaSnooze(sourceId: string, schedule: "near" | "later") {
  const now = new Date();
  const dueAt = new Date(now);

  if (schedule === "later") {
    const laterDays = Math.floor(Math.random() * 21) + 10;
    dueAt.setUTCDate(dueAt.getUTCDate() + laterDays);
  } else {
    dueAt.setUTCDate(dueAt.getUTCDate() + 1);
  }

  const snoozes = readIdeaSnoozes();
  snoozes[sourceId] = dueAt.toISOString();
  writeIdeaSnoozes(snoozes);
}

function buildThoughtDetails(input: {
  title: string;
  tags?: string[] | null;
  summaryContent?: string | null;
  rawInput?: string | null;
}): ThoughtDetails {
  const parsed = parseSourceSummaryContent(input.summaryContent ?? null, input.rawInput ?? null);

  return {
    title: input.title.trim() || "Nimetön ajatus",
    tags: input.tags?.filter((tag) => tag.trim().length > 0) ?? [],
    idea: parsed.idea.trim(),
    analysis: parsed.analysis.trim()
  };
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;

  return (
    <div className="review-tag-list">
      {tags.map((tag) => (
        <span className="tag-chip tag-chip-network tag-chip-inline" key={tag}>
          <span className="tag-chip-mark" aria-hidden="true">
            #
          </span>
          <span>{tag}</span>
        </span>
      ))}
    </div>
  );
}

function ThoughtPanel({
  details,
  sourceId,
  showOpenLink = true,
  closeLabel = "Palaa tähän tehtävään",
  stageLabel
}: {
  details: ThoughtDetails;
  sourceId: string;
  showOpenLink?: boolean;
  closeLabel?: string;
  stageLabel?: string;
}) {
  return (
    <article className="card review-thought-panel">
      {stageLabel ? (
        <div className="source-meta">
          <span className="pill">{stageLabel}</span>
        </div>
      ) : null}

      <TagList tags={details.tags} />
      <h3 className="review-thought-title">{details.title}</h3>

      {details.idea ? <div className="review-thought-block">{details.idea}</div> : null}
      {details.analysis && details.analysis !== details.idea ? (
        <div className="review-thought-block review-thought-block-analysis">{details.analysis}</div>
      ) : null}

      {showOpenLink || closeLabel ? (
        <div className="actions">
          {showOpenLink ? (
            <Link
              href={`/sources/${sourceId}?backTo=${encodeURIComponent("/review")}`}
              className="button-link secondary"
            >
              Tarkastele ajatusta
            </Link>
          ) : null}
          {closeLabel ? <span className="status">{closeLabel}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

function ReviewCard({
  card,
  history,
  onCompleted,
  pending
}: {
  card: DueReviewCard;
  history: CardAnswerHistoryItem[];
  onCompleted: (formData: FormData, behavior: "remove" | "moveToEnd") => void;
  pending: boolean;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showThought, setShowThought] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const thoughtDetails = buildThoughtDetails({
    title: card.source_title,
    tags: card.source_tags,
    summaryContent: card.summary_content,
    rawInput: card.raw_input
  });

  function buildFormData(schedule: "queue" | "near" | "later") {
    const formData = new FormData();
    formData.set("cardId", card.id);
    formData.set("userAnswer", userAnswer);
    formData.set("schedule", schedule);
    return formData;
  }

  return (
    <article className="card review-card-shell">
      <div className="review-card-head">
        <div className="source-meta">
          <span className="pill" data-variant="primary">
            {cardTypeLabel(card.card_type)}
          </span>
        </div>
        <TagList tags={card.source_tags ?? []} />
        <h2 className="review-card-title">{card.prompt}</h2>
      </div>

      <div className="form review-card-form">
        <label className="form-row">
          <span>Vastauksesi</span>
          <textarea
            name="draftAnswer"
            value={userAnswer}
            onChange={(event) => setUserAnswer(event.target.value)}
            placeholder="Kirjoita oma vastauksesi ennen kuin katsot mallivastausta."
          />
        </label>

        <div className="actions">
          <button
            type="button"
            className="secondary review-reveal-button"
            onClick={() => setShowAnswer((current) => !current)}
          >
            {showAnswer ? "Piilota vastaus" : "Näytä vastaus"}
          </button>
          <form
            action={() => {
              onCompleted(buildFormData("near"), "remove");
            }}
          >
            <SubmitButton
              className="secondary review-reveal-button"
              pendingText="Tallennan..."
              disabled={pending}
            >
              Ohita nyt (palaa huomenna)
            </SubmitButton>
          </form>
        </div>

        {showAnswer ? (
          <div className="list review-card-panels">
            <article className="card review-answer-panel">
              <p className="review-panel-label">Mallivastaus</p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{card.answer}</p>
            </article>

            {history.length > 0 ? (
              <article className="card review-answer-panel">
                <p className="review-panel-label">Aiemmat vastaukset</p>
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
              </article>
            ) : null}

            <div className="actions">
              <button
                type="button"
                className="secondary review-idea-button"
                onClick={() => setShowThought((current) => !current)}
              >
                {showThought ? "Palaa tähän tehtävään" : "Näytä taustalla oleva ajatus"}
              </button>
            </div>

            {showThought ? <ThoughtPanel details={thoughtDetails} sourceId={card.source_id} /> : null}

            <article className="card review-answer-panel review-schedule-panel">
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Milloin tämä nousee uudelleen?</h3>
              <div className="review-schedule-grid">
                <form
                  action={() => {
                    onCompleted(buildFormData("queue"), "moveToEnd");
                  }}
                >
                  <SubmitButton
                    className="secondary review-schedule-button"
                    pendingText="Tallennan..."
                    disabled={pending || !userAnswer.trim()}
                  >
                    Heti
                  </SubmitButton>
                </form>
                <form
                  action={() => {
                    onCompleted(buildFormData("near"), "remove");
                  }}
                >
                  <SubmitButton
                    className="primary review-schedule-button"
                    pendingText="Tallennan..."
                    disabled={pending || !userAnswer.trim()}
                  >
                    Huomenna
                  </SubmitButton>
                </form>
                <form
                  action={() => {
                    onCompleted(buildFormData("later"), "remove");
                  }}
                >
                  <SubmitButton
                    className="success review-schedule-button"
                    pendingText="Tallennan..."
                    disabled={pending || !userAnswer.trim()}
                  >
                    Myöhemmin ({">"}10 päivää)
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
  onSchedule,
  pending
}: {
  idea: UnrefinedIdeaQueueItem;
  onSchedule: (formData: FormData) => void;
  pending: boolean;
}) {
  const thoughtDetails = buildThoughtDetails({
    title: idea.title,
    tags: idea.tags,
    summaryContent: idea.summary_content,
    rawInput: idea.raw_input
  });

  return (
    <article className="card review-card-shell review-card-shell-idea">
      <ThoughtPanel
        details={thoughtDetails}
        sourceId={idea.id}
        showOpenLink={false}
        closeLabel=""
        stageLabel="Työstössä"
      />

      <div className="card review-answer-panel">
        <p className="review-panel-label">Miksi tämä on jonossa</p>
        <p style={{ margin: 0 }}>
          Ajatus on tallessa, mutta siitä puuttuu vielä viimeistelyä tai tehtäviä, jotta se nousisi
          jatkossa tehtäväjonoon valmiimpana.
        </p>
      </div>

      <div className="actions review-idea-actions">
        <Link
          href={`/sources/${idea.id}?backTo=${encodeURIComponent("/review")}`}
          className="button-link primary review-idea-button"
        >
          Työstä nyt
        </Link>
        <form
          action={() => {
            const formData = new FormData();
            formData.set("sourceId", idea.id);
            formData.set("schedule", "near");
            onSchedule(formData);
          }}
        >
          <SubmitButton className="secondary review-idea-button" pendingText="Tallennan..." disabled={pending}>
            Jatka myöhemmin (palaa huomenna)
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}

export function ReviewQueue({ initialItems }: Props) {
  const [items, setItems] = useState(() => filterVisibleItems(initialItems));
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const currentItem = items[0] ?? null;
  const headerLead = currentItem
    ? "Yksi yhteinen jono kokoaa sekä tehtävät että keskeneräiset ajatukset. Tee tehtävä tai viimeistele ajatus, ja siirry sitten seuraavaan."
    : "Jono on tyhjä juuri nyt. Voit tallentaa uusia ajatuksia tai jatkaa olemassa olevien työstämistä.";

  function removeCurrentItem() {
    setItems((current) => current.slice(1));
  }

  function moveCurrentItemToEnd() {
    setItems((current) => (current.length <= 1 ? current : [...current.slice(1), current[0]]));
  }

  function handleReviewCompleted(formData: FormData, behavior: "remove" | "moveToEnd") {
    setErrorMessage("");

    startTransition(async () => {
      try {
        await completeReviewAction(formData);
        if (behavior === "moveToEnd") {
          moveCurrentItemToEnd();
          return;
        }

        removeCurrentItem();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Tehtävän tallennus epäonnistui. Yritä uudelleen."
        );
      }
    });
  }

  function handleIdeaScheduled(formData: FormData) {
    setErrorMessage("");

    startTransition(async () => {
      try {
        const sourceId = formData.get("sourceId");
        const scheduleValue = formData.get("schedule");
        if (typeof sourceId === "string") {
          storeIdeaSnooze(sourceId, scheduleValue === "later" ? "later" : "near");
        }
        await scheduleIdeaReviewAction(formData);
        removeCurrentItem();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Ajatuksen ajastus epäonnistui. Yritä uudelleen."
        );
      }
    });
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title-with-icon">
          <Image
            src="/brand/action-icons/Syvenna.PNG"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="page-title-icon"
          />
          <h1>Syvenny</h1>
        </div>
        <p className="review-queue-total">{queueLabel(items.length)}</p>
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
            onCompleted={handleReviewCompleted}
            pending={isPending}
          />
        ) : (
          <IdeaCard
            key={currentItem.idea.id}
            idea={currentItem.idea}
            onSchedule={handleIdeaScheduled}
            pending={isPending}
          />
        )
      ) : (
        <article className="card review-card-shell review-empty-card">
          <p className="muted" style={{ marginBottom: 0 }}>
            Ei uusia tehtäviä juuri nyt. Voit tallentaa uusia ajatuksia tai syventää olemassa olevia
            ajatuksia.
          </p>
        </article>
      )}
    </>
  );
}
