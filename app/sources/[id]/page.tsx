import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { getSourceWithDetails, listAppliedInsights } from "@/lib/db";
import {
  acceptAllSuggestedAction,
  generateCardsAction,
  logInsightAction,
  saveCardAction,
  saveSummaryAction,
  setCardStatusAction
} from "@/app/sources/actions";
import { CardType, CaptureRole, SourceType } from "@/lib/types";

type SourceDetails = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  url: string | null;
  capture_mode: string;
};

type SummaryDetails = {
  id: string;
  content: string;
  raw_input: string | null;
  input_modality: string;
  updated_at: string;
};

type CardDetails = {
  id: string;
  status: "suggested" | "active" | "rejected";
  card_type: CardType;
  prompt: string;
  answer: string;
};

type CaptureMessage = {
  id: string;
  role: CaptureRole;
  content: string;
  created_at: string;
};

export default async function SourceDetailsPage({
  params
}: {
  params: { id: string };
}) {
  let source: SourceDetails | null = null;
  let summary: SummaryDetails | null = null;
  let cards: CardDetails[] = [];
  let captureMessages: CaptureMessage[] = [];
  let insights: Array<{ id: string; note: string; created_at: string }> = [];
  let loadError = "";

  try {
    const result = await getSourceWithDetails(params.id);
    source = result.source;
    summary = result.summary;
    cards = result.cards;
    captureMessages = result.captureMessages;
    insights = await listAppliedInsights(params.id);
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
        <p className="muted">Source details with capture history, summary, cards and applied insights.</p>
      </div>

      <article className="card">
        <div className="source-meta">
          <span className="pill">{source.type}</span>
          <span className="pill">{source.capture_mode}</span>
          {source.author ? <span>{source.author}</span> : null}
          {source.origin ? <span>{source.origin}</span> : null}
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          ) : null}
        </div>
      </article>

      {captureMessages.length > 0 ? (
        <article className="card">
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Capture conversation</h2>
            <Link href={`/capture?sourceId=${source.id}`} className="button-link secondary">
              Continue in capture
            </Link>
          </div>
          <div className="list" style={{ marginTop: "0.8rem" }}>
            {captureMessages.map((message) => (
              <article className="card" key={message.id}>
                <div className="source-meta">
                  <span
                    className="pill"
                    data-variant={message.role === "assistant" ? "primary" : undefined}
                  >
                    {message.role}
                  </span>
                  <span>{new Date(message.created_at).toLocaleString("fi-FI")}</span>
                </div>
                <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
              </article>
            ))}
          </div>
        </article>
      ) : null}

      <article className="card">
        <h2 style={{ marginTop: 0 }}>Summary</h2>
        <form className="form" action={saveSummaryAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <input type="hidden" name="rawInput" value={summary?.raw_input ?? ""} />
          <input type="hidden" name="inputModality" value={summary?.input_modality ?? "text"} />
          <textarea
            name="content"
            defaultValue={summary?.content ?? ""}
            placeholder="Write or refine the source summary here..."
            required
          />
          <div className="actions">
            <SubmitButton className="primary" pendingText="Saving...">
              Save summary
            </SubmitButton>
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
              <SubmitButton className="secondary" pendingText="Generating...">
                Generate cards from summary
              </SubmitButton>
            </form>

            <form action={acceptAllSuggestedAction}>
              <input type="hidden" name="sourceId" value={source.id} />
              <SubmitButton className="secondary" pendingText="Accepting...">
                Accept all suggested
              </SubmitButton>
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
                    <option value="decision">decision</option>
                  </select>
                </label>

                <div className="actions">
                  <SubmitButton className="secondary" pendingText="Saving...">
                    Save edits
                  </SubmitButton>
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
                  <SubmitButton className="success" pendingText="Accepting...">
                    Accept
                  </SubmitButton>
                </form>

                <form action={setCardStatusAction}>
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="prompt" value={card.prompt} />
                  <input type="hidden" name="answer" value={card.answer} />
                  <input type="hidden" name="cardType" value={card.card_type} />
                  <input type="hidden" name="status" value="rejected" />
                  <SubmitButton className="danger" pendingText="Rejecting...">
                    Reject
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="card">
        <h2 style={{ marginTop: 0 }}>Applied insights</h2>
        <form className="form" action={logInsightAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <label className="form-row">
            <span>Where did you apply this?</span>
            <textarea name="note" placeholder="Write a concrete application from today." required />
          </label>
          <div className="actions">
            <SubmitButton className="primary" pendingText="Saving...">
              Log insight
            </SubmitButton>
          </div>
        </form>

        <div className="list" style={{ marginTop: "0.8rem" }}>
          {insights.length === 0 ? (
            <p className="muted">No applied insights yet.</p>
          ) : (
            insights.map((insight) => (
              <article key={insight.id} className="card">
                <p style={{ marginTop: 0, marginBottom: "0.45rem", whiteSpace: "pre-wrap" }}>
                  {insight.note}
                </p>
                <p className="status" style={{ marginBottom: 0 }}>
                  {new Date(insight.created_at).toLocaleString("fi-FI")}
                </p>
              </article>
            ))
          )}
        </div>
      </article>

      <div className="actions">
        <Link href="/sources" className="button-link secondary">
          Back to Sources
        </Link>
        <Link href="/review" className="button-link secondary">
          Go to Daily Review
        </Link>
        <Link href="/progress" className="button-link primary">
          Open Progress
        </Link>
      </div>
    </section>
  );
}
