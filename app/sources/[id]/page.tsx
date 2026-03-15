import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import {
  acceptAllSuggestedAction,
  deleteCardAction,
  deleteSourceAction,
  generateCardsAction,
  saveCardAction,
  setCardStatusAction
} from "@/app/sources/actions";
import { SourceEditorForm } from "@/app/sources/[id]/source-editor-form";
import { getSourceWithDetails } from "@/lib/db";
import { parseSourceSummaryContent, suggestSourceTags } from "@/lib/source-editor";
import { CardType, SourceType } from "@/lib/types";

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
  let captureAssets: CaptureAsset[] = [];
  let loadError = "";

  try {
    const result = await getSourceWithDetails(params.id);
    source = result.source;
    summary = result.summary;
    cards = result.cards;
    captureAssets = result.captureAssets;
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

  const parsedSummary = parseSourceSummaryContent(summary?.content, summary?.raw_input);
  const resolvedTags =
    source.tags && source.tags.length > 0
      ? source.tags
      : suggestSourceTags({
          title: source.title,
          idea: parsedSummary.idea,
          analysis: parsedSummary.analysis,
          rawInput: summary?.raw_input
        });
  const lastSavedLabel = summary?.updated_at
    ? `Viimeksi tallennettu ${new Date(summary.updated_at).toLocaleString("fi-FI")}`
    : "Ei tallennettu viela";

  return (
    <section className="grid source-workspace">
      <div className="page-header source-workspace-header">
        <h1>Idean jalostaminen</h1>
        <p className="muted">
          Muokkaa ideasta selkeä otsikko, ydinajatus, analyysi ja tagit ennen korttien luontia.
          {" "}Voit myös vain tallentaa tiedot ja jalostaa idean valmiiksi myöhemmin.
        </p>
      </div>

      <div className="source-workspace-layout">
        <article className="card source-editor-card">
          <div className="source-editor-topbar">
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
            initialTags={resolvedTags}
            rawInput={summary?.raw_input ?? ""}
            inputModality={summary?.input_modality ?? "text"}
          />

          <div className="source-origin-panel">
            <details className="capture-details source-capture-details">
              <summary>Näytä alkuperäinen capture</summary>

              <div className="source-capture-details-body">
                <div className="source-meta">
                  {source.author ? <span>{source.author}</span> : null}
                  {source.origin ? <span>{source.origin}</span> : null}
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      Avaa linkki
                    </a>
                  ) : null}
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
                          <audio
                            controls
                            className="capture-audio-player"
                            src={assetUrl(asset.mime_type, asset.base64_data)}
                          />
                        )}
                      </article>
                    ))}
                  </div>
                ) : null}

                {summary?.raw_input ? (
                  <p className="source-capture-raw-text">{summary.raw_input}</p>
                ) : null}
              </div>
            </details>
          </div>
        </article>
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

        <div className="source-edit-footer source-page-actions">
          <Link href="/sources" className="button-link secondary source-edit-later">
            Jalosta myohemmin
          </Link>
          <div className="source-edit-save-group">
            <p className="status" style={{ margin: 0 }}>
              {lastSavedLabel}
            </p>
            <SubmitButton
              className="primary source-edit-save"
              pendingText="Tallennetaan..."
              form="source-editor-form"
            >
              Tallenna ja luo kortit
            </SubmitButton>
          </div>
        </div>
      </article>

      <div className="actions">
        <form action={deleteSourceAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <SubmitButton
            className="danger"
            pendingText="Deleting idea..."
            confirmMessage="Poistetaanko idea pysyvästi? Tämä poistaa myös siihen liittyvät kortit."
          >
            Poista idea
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}
