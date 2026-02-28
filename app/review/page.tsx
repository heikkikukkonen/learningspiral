"use client";

import { useMemo, useState } from "react";
import { demoDueCards } from "@/lib/mock-data";
import { Card } from "@/lib/types";

const ratingLabels: Record<number, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy"
};

function nextIntervalDays(current: number, rating: number): number {
  if (rating <= 1) return 1;
  if (rating === 2) return Math.max(2, Math.round(current * 1.2));
  if (rating === 3) return Math.max(3, Math.round(current * 2));
  return Math.max(5, Math.round(current * 2.8));
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<Card[]>(demoDueCards);
  const [index, setIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const current = queue[index];
  const progress = useMemo(() => {
    if (queue.length === 0) return 100;
    return Math.round((doneCount / queue.length) * 100);
  }, [doneCount, queue.length]);

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Daily Review</h1>
        <p className="muted">
          Prompt - show answer - rating 1-4. Tämä versio simuloi scheduling-logiikkaa.
        </p>
      </div>

      <article className="card">
        <p className="status" style={{ marginTop: 0 }}>
          Progress: {doneCount}/{queue.length} ({progress}%)
        </p>

        {!current ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Review complete</h2>
            <p className="muted">Ei due-kortteja jäljellä tälle sessiolle.</p>
          </div>
        ) : (
          <div className="form">
            <span className="pill" data-variant="primary">
              {current.cardType}
            </span>
            <h2 style={{ margin: 0 }}>{current.prompt}</h2>

            {answerVisible ? (
              <article className="card">
                <strong>Answer</strong>
                <p style={{ marginBottom: 0 }}>{current.answer}</p>
              </article>
            ) : (
              <button
                type="button"
                className="secondary"
                onClick={() => setAnswerVisible(true)}
              >
                Show answer
              </button>
            )}

            {answerVisible ? (
              <div className="actions">
                {[1, 2, 3, 4].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className="secondary"
                    onClick={() => {
                      const updated = [...queue];
                      const interval = nextIntervalDays(1, rating);
                      const due = new Date();
                      due.setDate(due.getDate() + interval);
                      updated[index] = {
                        ...updated[index],
                        dueAt: due.toISOString()
                      };
                      setQueue(updated);
                      setDoneCount((prev) => prev + 1);
                      setIndex((prev) => prev + 1);
                      setAnswerVisible(false);
                    }}
                  >
                    {rating} - {ratingLabels[rating]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </article>
    </section>
  );
}
