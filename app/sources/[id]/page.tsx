import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { getSourceWithDetails, listAppliedInsights } from "@/lib/db";
import {
  acceptAllSuggestedAction,
  deleteCardAction,
  generateCardsAction,
  logInsightAction,
  saveCardAction,
  setCardStatusAction
} from "@/app/sources/actions";
import { CardType, CaptureRole, SourceType } from "@/lib/types";
import { sendCaptureMessageAction } from "@/app/capture/actions";
import { parseSourceSummaryContent } from "@/lib/source-editor";
import { SourceEditorForm } from "@/app/sources/[id]/source-editor-form";
import Image from "next/image";

type SourceDetails = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  url: string | null;
  tags: string[] | null;
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

type CaptureAsset = {
  id: string;
  kind: "image" | "audio";
  file_name: string;
  mime_type: string;
  file_size: number;
  base64_data: string;
  created_at: string;
};

function assetUrl(mimeType: string, base64Data: string): string {
  return `data:${mimeType};base64,${base64Data}`;
}

export default async function SourceDetailsPage({
  params
}: {
  params: { id: string };
}) {
  let source: SourceDetails | null = null;
  let summary: SummaryDetails | null = null;
  let cards: CardDetails[] = [];
  let captureMessages: CaptureMessage[] = [];
  let captureAssets: CaptureAsset[] = [];
  let insights: Array<{ id: string; note: string; created_at: string }> = [];
  let loadError = "";

  try {
    const result = await getSourceWithDetails(params.id);
    source = result.source;
    summary = result.summary;
    cards = result.cards;
    captureMessages = result.captureMessages;
    captureAssets = result.captureAssets;
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

  const parsedSummary = parseSourceSummaryContent(summary?.content);
  const latestAssistantMessage = [...captureMessages].reverse().find((message) => message.role === "assistant");
  const rawTextMessage = captureMessages.find((message) => message.role === "user");
  const lastSavedLabel = summary?.updated_at
    ? `Viimeksi tallennettu ${new Date(summary.updated_at).toLocaleString("fi-FI")}`
    : "Ei tallennettu viela";

  return (
    <section className="grid source-workspace">
      <div className="page-header source-workspace-header">
        <p className="source-stepper" aria-label="Vaiheet">
          <span>1. Syötä idea</span>
          <span className="is-active">2. Jalosta idea</span>
          <span>3. Luo kortteja tai tehtävä</span>
        </p>
        <h1>{source.title}</h1>
        <p className="muted">
          Yhdistetty capture- ja source-näkymä, jossa voit muokata idean lopulliseen muotoon ja jutella AI:n kanssa.
        </p>
      </div>

      <div className="source-workspace-layout">
        <article className="card source-editor-card">
          <div className="source-editor-topbar">
            <Link href="/sources" className="source-back-link">
              {"<"} Takaisin
            </Link>
            <div className="source-meta">
              <span className="pill">{source.type}</span>
              <span className="pill">{source.capture_mode}</span>
            </div>
          </div>

          <SourceEditorForm
            sourceId={source.id}
            initialTitle={source.title}
            initialIdea={parsedSummary.idea}
            initialAnalysis={parsedSummary.analysis}
            initialTags={source.tags ?? []}
            rawInput={summary?.raw_input ?? ""}
            inputModality={summary?.input_modality ?? "text"}
            lastSavedLabel={lastSavedLabel}
          />

          <div className="source-origin-panel">
            <div className="source-origin-header">
              <h2 style={{ margin: 0 }}>Alkuperäinen capture</h2>
              <div className="source-meta">
                {source.author ? <span>{source.author}</span> : null}
                {source.origin ? <span>{source.origin}</span> : null}
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Avaa linkki
                  </a>
                ) : null}
              </div>
            </div>

            {captureAssets.length > 0 ? (
              <div className="source-origin-assets">
                {captureAssets.map((asset) => (
                  <article key={asset.id} className="source-origin-asset">
                    <div className="source-meta" style={{ marginBottom: "0.6rem" }}>
                      <span className="pill" data-variant="primary">
                        {asset.kind}
                      </span>
                      <span>{asset.file_name}</span>
                    </div>
                    {asset.kind === "image" ? (
                      <Image
                        src={assetUrl(asset.mime_type, asset.base64_data)}
                        alt={asset.file_name}
                        className="capture-asset-preview"
                        width={1200}
                        height={900}
                        unoptimized
                      />
                    ) : (
                      <audio controls className="capture-audio-player" src={assetUrl(asset.mime_type, asset.base64_data)} />
                    )}
                  </article>
                ))}
              </div>
            ) : null}

            {summary?.raw_input || rawTextMessage ? (
              <details className="capture-details" open>
                <summary>Näytä alkuperäinen raakateksti</summary>
                <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {summary?.raw_input || rawTextMessage?.content}
                </p>
              </details>
            ) : null}
          </div>
        </article>

        <aside className="card source-ai-card">
          <div className="source-ai-header">
            <div>
              <h2 style={{ margin: 0 }}>AI-analyysi</h2>
              <p className="status" style={{ marginBottom: 0 }}>
                Pyydä vaihtoehtoisia näkökulmia, tiivistä ideaa tai ehdota uusia tageja.
              </p>
            </div>
            {latestAssistantMessage ? <span className="pill" data-variant="primary">AI</span> : null}
          </div>

          <div className="source-ai-thread">
            {captureMessages.length === 0 ? (
              <p className="muted">Keskustelua ei vielä ole. Lähetä viesti AI:lle oikealta.</p>
            ) : (
              captureMessages.map((message) => (
                <article
                  className={`source-chat-bubble ${message.role === "assistant" ? "is-assistant" : "is-user"}`}
                  key={message.id}
                >
                  <div className="source-meta">
                    <span
                      className="pill"
                      data-variant={message.role === "assistant" ? "primary" : undefined}
                    >
                      {message.role === "assistant" ? "AI" : "Sinä"}
                    </span>
                    <span>{new Date(message.created_at).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
                </article>
              ))
            )}
          </div>

          <form className="form source-ai-form" action={sendCaptureMessageAction}>
            <input type="hidden" name="sourceId" value={source.id} />
            <label className="form-row">
              <span>Kysy AI:lta seuraava jalostus</span>
              <textarea
                name="message"
                placeholder="Esim. tee tästä terävämpi idea, anna eri näkökulma, ehdota parempaa otsikkoa tai 5 tagia."
                required
              />
            </label>
            <SubmitButton className="primary" pendingText="AI vastaa..." loadingVariant="idea-network">
              Lähetä
            </SubmitButton>
          </form>
        </aside>
      </div>

      <article className="card">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Suggested cards</h2>
          <div className="actions">
            <form action={generateCardsAction}>
              <input type="hidden" name="sourceId" value={source.id} />
              <SubmitButton
                className="secondary"
                pendingText="Generating..."
                loadingVariant="idea-network"
              >
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

                <form action={deleteCardAction}>
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="cardId" value={card.id} />
                  <SubmitButton
                    className="danger"
                    pendingText="Deleting..."
                    confirmMessage="Poistetaanko kortti pysyvästi?"
                  >
                    Delete
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
