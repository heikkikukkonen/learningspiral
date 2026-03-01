"use client";

import { useState } from "react";
import { completeReviewAction } from "@/app/sources/actions";
import { SubmitButton } from "@/app/components/submit-button";
import type { CardAnswerHistoryItem, DueReviewCard } from "@/lib/db";

type Props = {
  card: DueReviewCard;
  history: CardAnswerHistoryItem[];
  remainingCount: number;
  totalTodayCount: number;
};

export function ReviewSessionCard({
  card,
  history,
  remainingCount,
  totalTodayCount
}: Props) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");

  return (
    <article className="card">
      <p className="status" style={{ marginTop: 0 }}>
        {remainingCount} / {totalTodayCount} tehtavaa tanaan
      </p>

      <div className="source-meta">
        <span className="pill" data-variant="primary">
          {card.card_type}
        </span>
        <span className="pill">{card.source_title}</span>
      </div>

      <h2 style={{ marginBottom: "0.5rem" }}>{card.prompt}</h2>

      <form className="form" action={completeReviewAction}>
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="userAnswer" value={userAnswer} />

        <label className="form-row">
          <span>Vastauksesi</span>
          <textarea
            name="draftAnswer"
            value={userAnswer}
            onChange={(event) => setUserAnswer(event.target.value)}
            placeholder="Kirjoita oma vastauksesi ennen mallivastauksen katsomista."
            required
          />
        </label>

        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => setShowAnswers((current) => !current)}
          >
            {showAnswers ? "Piilota vastaukset" : "Nayta vastaukset"}
          </button>
        </div>

        {showAnswers ? (
          <div className="list">
            <article className="card">
              <h3 style={{ marginTop: 0, marginBottom: "0.4rem" }}>Oikea vastaus</h3>
              <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{card.answer}</p>
            </article>

            <article className="card">
              <h3 style={{ marginTop: 0, marginBottom: "0.4rem" }}>Aiemmat vastauksesi</h3>
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

            <details className="card">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                Avaa tehtavaan liittyva teoria
              </summary>
              <div style={{ marginTop: "0.7rem" }}>
                <p className="status" style={{ marginTop: 0 }}>
                  Lahde: {card.source_title}
                </p>
                <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {card.summary_content || "Teoriaa ei loytynyt tasta lahteesta viela."}
                </p>
              </div>
            </details>

            <article className="card">
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                Kuinka tarkeana pidat, etta tama kysytaan uudestaan?
              </h3>
              <div className="actions">
                <SubmitButton className="secondary" pendingText="Tallennetaan..." name="rating" value="2">
                  Matala
                </SubmitButton>
                <SubmitButton className="primary" pendingText="Tallennetaan..." name="rating" value="3">
                  Tarkea
                </SubmitButton>
                <SubmitButton className="success" pendingText="Tallennetaan..." name="rating" value="4">
                  Erittain tarkea
                </SubmitButton>
              </div>
            </article>
          </div>
        ) : null}
      </form>
    </article>
  );
}
