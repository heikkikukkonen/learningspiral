"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { demoSources, demoSuggestedCards, demoSummaryBySourceId } from "@/lib/mock-data";
import { Card, CardType } from "@/lib/types";

function createGeneratedCards(sourceId: string): Card[] {
  return [
    {
      id: `gen-${sourceId}-1`,
      sourceId,
      status: "suggested",
      cardType: "recall",
      prompt: "Mikä on tämän lähteen tärkein ydinväite?",
      answer:
        "Ydinsanoma kiteytyy yhteen periaatteeseen, jota voi soveltaa toistuvissa päätöstilanteissa."
    },
    {
      id: `gen-${sourceId}-2`,
      sourceId,
      status: "suggested",
      cardType: "apply",
      prompt: "Miten sovellat ideaa ensi viikolla käytännössä?",
      answer:
        "Valitse yksi tuleva päätös, nimeä riskit ja käytä lähteen periaatetta arvioinnin runkona."
    }
  ];
}

export default function SourceDetailsPage({
  params
}: {
  params: { id: string };
}) {
  const source = useMemo(
    () => demoSources.find((item) => item.id === params.id) ?? demoSources[0],
    [params.id]
  );

  const initialSummary = demoSummaryBySourceId[source.id]?.content ?? "";

  const [summary, setSummary] = useState(initialSummary);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>(
    demoSuggestedCards.filter((card) => card.sourceId === source.id)
  );

  return (
    <section className="grid">
      <div className="page-header">
        <h1>{source.title}</h1>
        <p className="muted">
          Lähde, tiivistelmä ja AI-korttiehdotukset samassa näkymässä.
        </p>
      </div>

      <article className="card">
        <div className="source-meta">
          <span className="pill">{source.type}</span>
          {source.author ? <span>{source.author}</span> : null}
          {source.origin ? <span>{source.origin}</span> : null}
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          ) : null}
        </div>
      </article>

      <article className="card">
        <h2 style={{ marginTop: 0 }}>Summary</h2>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            setSavedAt(new Date().toLocaleString("fi-FI"));
          }}
        >
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Kirjoita lähteen tiivistelmä tähän..."
          />
          <div className="actions">
            <button type="submit" className="primary">
              Save summary
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const generated = createGeneratedCards(source.id);
                setCards((prev) => [...generated, ...prev]);
              }}
            >
              Generate cards from summary
            </button>
          </div>
          <p className="status">Last saved: {savedAt ?? "not saved in this session"}</p>
        </form>
      </article>

      <article className="card">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Suggested cards</h2>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setCards((prev) =>
                prev.map((card) =>
                  card.status === "suggested"
                    ? {
                        ...card,
                        status: "active",
                        dueAt: new Date().toISOString()
                      }
                    : card
                )
              )
            }
          >
            Accept all suggested
          </button>
        </div>

        <div className="list" style={{ marginTop: "0.8rem" }}>
          {cards.length === 0 ? <p className="muted">No suggested cards yet.</p> : null}

          {cards.map((card) => (
            <article className="card" key={card.id}>
              <div className="source-meta">
                <span className="pill" data-variant="primary">
                  {card.cardType}
                </span>
                <span className="pill">{card.status}</span>
              </div>

              <div className="form" style={{ marginTop: "0.7rem" }}>
                <label className="form-row">
                  <span>Prompt</span>
                  <input
                    value={card.prompt}
                    onChange={(event) =>
                      setCards((prev) =>
                        prev.map((item) =>
                          item.id === card.id
                            ? { ...item, prompt: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                </label>
                <label className="form-row">
                  <span>Answer</span>
                  <textarea
                    value={card.answer}
                    onChange={(event) =>
                      setCards((prev) =>
                        prev.map((item) =>
                          item.id === card.id
                            ? { ...item, answer: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                </label>
                <label className="form-row">
                  <span>Type</span>
                  <select
                    value={card.cardType}
                    onChange={(event) =>
                      setCards((prev) =>
                        prev.map((item) =>
                          item.id === card.id
                            ? { ...item, cardType: event.target.value as CardType }
                            : item
                        )
                      )
                    }
                  >
                    <option value="recall">recall</option>
                    <option value="apply">apply</option>
                    <option value="reflect">reflect</option>
                  </select>
                </label>
              </div>

              <div className="actions" style={{ marginTop: "0.75rem" }}>
                <button
                  type="button"
                  className="success"
                  onClick={() =>
                    setCards((prev) =>
                      prev.map((item) =>
                        item.id === card.id
                          ? { ...item, status: "active", dueAt: new Date().toISOString() }
                          : item
                      )
                    )
                  }
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    setCards((prev) =>
                      prev.map((item) =>
                        item.id === card.id ? { ...item, status: "rejected" } : item
                      )
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      <div className="actions">
        <Link href="/sources" className="button-link secondary">
          Back to Sources
        </Link>
        <Link href="/review" className="button-link primary">
          Go to Daily Review
        </Link>
      </div>
    </section>
  );
}
