import Link from "next/link";
import { notFound } from "next/navigation";
import { getSourceWithDetails } from "@/lib/db";
import {
  acceptAllSuggestedAction,
  generateCardsAction,
  saveCardAction,
  saveSummaryAction,
  setCardStatusAction
} from "@/app/sources/actions";
import { CardType, SourceType } from "@/lib/types";

type SourceDetails = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  url: string | null;
};

type SummaryDetails = {
  id: string;
  content: string;
  updated_at: string;
};

type CardDetails = {
  id: string;
  status: "suggested" | "active" | "rejected";
  card_type: CardType;
  prompt: string;
  answer: string;
};

export default async function SourceDetailsPage({
  params
}: {
  params: { id: string };
}) {
  let source: SourceDetails | null = null;
  let summary: SummaryDetails | null = null;
  let cards: CardDetails[] = [];
  let loadError = "";

  try {
    const result = await getSourceWithDetails(params.id);
    source = result.source;
    summary = result.summary;
    cards = result.cards;
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load source. Check Supabase configuration.";
  }

  if (loadError) {
    return (
      <section className="review-shell">
        <div className="page-header">
          <h1>Source</h1>
        </div>
        <article className="card">
          <strong>Database not connected</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
        </article>
      </section>
    );
  }

  if (!source) {
    notFound();
  }

  return (
    <section className="grid">
      <div className="page-header">
        <h1>{source.title}</h1>
        <p className="muted">Lahde, tiivistelma ja kortit samassa nakymassa.</p>
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
        <form className="form" action={saveSummaryAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <textarea
            name="content"
            defaultValue={summary?.content ?? ""}
            placeholder="Kirjoita lahteen tiivistelma tahan..."
            required
          />
          <div className="actions">
            <button type="submit" className="primary">
              Save summary
            </button>
          </div>
          <p className="status">
            Last saved:{" "}
            {summary?.updated_at
              ? new Date(summary.updated_at).toLocaleString("fi-FI")
              : "not saved yet"}
          </p>
        </form>
      </article>

      <article className="card">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Suggested cards</h2>
          <div className="actions">
            <form action={generateCardsAction}>
              <input type="hidden" name="sourceId" value={source.id} />
              <input type="hidden" name="summaryId" value={summary?.id ?? ""} />
              <input type="hidden" name="summaryContent" value={summary?.content ?? ""} />
              <button type="submit" className="secondary">
                Generate cards from summary
              </button>
            </form>

            <form action={acceptAllSuggestedAction}>
              <input type="hidden" name="sourceId" value={source.id} />
              <button type="submit" className="secondary">
                Accept all suggested
              </button>
            </form>
          </div>
        </div>

        <div className="list" style={{ marginTop: "0.8rem" }}>
          {cards.length === 0 ? <p className="muted">No cards yet.</p> : null}

          {cards.map((card) => (
            <article className="card" key={card.id}>
              <div className="source-meta">
                <span className="pill" data-variant="primary">
                  {card.card_type}
                </span>
                <span className="pill">{card.status}</span>
              </div>

              <form className="form" style={{ marginTop: "0.7rem" }} action={saveCardAction}>
                <input type="hidden" name="sourceId" value={source.id} />
                <input type="hidden" name="cardId" value={card.id} />

                <label className="form-row">
                  <span>Prompt</span>
                  <input name="prompt" defaultValue={card.prompt} required />
                </label>
                <label className="form-row">
                  <span>Answer</span>
                  <textarea name="answer" defaultValue={card.answer} required />
                </label>
                <label className="form-row">
                  <span>Type</span>
                  <select name="cardType" defaultValue={card.card_type}>
                    <option value="recall">recall</option>
                    <option value="apply">apply</option>
                    <option value="reflect">reflect</option>
                  </select>
                </label>

                <div className="actions">
                  <button type="submit" className="secondary">
                    Save edits
                  </button>
                </div>
              </form>

              <div className="actions" style={{ marginTop: "0.75rem" }}>
                <form action={setCardStatusAction}>
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="prompt" value={card.prompt} />
                  <input type="hidden" name="answer" value={card.answer} />
                  <input type="hidden" name="cardType" value={card.card_type} />
                  <input type="hidden" name="status" value="active" />
                  <button type="submit" className="success">
                    Accept
                  </button>
                </form>

                <form action={setCardStatusAction}>
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="prompt" value={card.prompt} />
                  <input type="hidden" name="answer" value={card.answer} />
                  <input type="hidden" name="cardType" value={card.card_type} />
                  <input type="hidden" name="status" value="rejected" />
                  <button type="submit" className="danger">
                    Reject
                  </button>
                </form>
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
