import { notFound } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import {
  deleteCardAction,
  generateCardsAction,
  setCardStatusAction
} from "@/app/sources/actions";
import { SourceEditorForm } from "@/app/sources/[id]/source-editor-form";
import { SourcePageActions } from "@/app/sources/[id]/source-page-actions";
import { getSourceWithDetails, listUserTagStats } from "@/lib/db";
import { parseSourceSummaryContent } from "@/lib/source-editor";
import { deriveSourceIdeaStage, sourceIdeaStageLabel } from "@/lib/source-status";
import { CardType, SourceType, TagSuggestion } from "@/lib/types";

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

function sourceTypeLabel(type: SourceType): string | null {
  return type === "other" ? null : type;
}

function captureModeLabel(captureMode: string): string | null {
  return captureMode === "chat" ? null : captureMode;
}

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
  let tagSuggestions: TagSuggestion[] = [];
  let loadError = "";

  try {
    const [result, userTags] = await Promise.all([
      getSourceWithDetails(params.id),
      listUserTagStats()
    ]);
    source = result.source;
    summary = result.summary;
    cards = result.cards;
    captureAssets = result.captureAssets;
    tagSuggestions = userTags;
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
          <h1>Ajatus</h1>
        </div>
        <article className="card">
          <strong>Tietokanta ei ole yhteydessa</strong>
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
  const lastSavedLabel = summary?.updated_at
    ? `Viimeksi tallennettu ${new Date(summary.updated_at).toLocaleString("fi-FI")}`
    : "Ei tallennettu viela";
  const hasCards = cards.length > 0;
  const sourceStageLabel = sourceIdeaStageLabel(deriveSourceIdeaStage(hasCards));

  return (
    <section className="grid source-workspace">
      <div className="page-header source-workspace-header">
        <h1>Syvenna ajatusta</h1>
        <p className="muted">
          Anna ajatukselle selkea muoto. Tunnisteet auttavat ajatuksia loytamaan toisensa, ja tehtava auttaa palaamaan tahan myohemmin.
        </p>
      </div>

      <div className="source-workspace-layout">
        <article className="card source-editor-card">
          <div className="source-editor-topbar">
            <div className="source-meta">
              {sourceTypeLabel(source.type) ? <span className="pill">{sourceTypeLabel(source.type)}</span> : null}
              {captureModeLabel(source.capture_mode) ? (
                <span className="pill">{captureModeLabel(source.capture_mode)}</span>
              ) : null}
              <span className="pill">{sourceStageLabel}</span>
            </div>
          </div>

          <SourceEditorForm
            sourceId={source.id}
            initialTitle={source.title}
            initialIdea={parsedSummary.idea}
            initialAnalysis={parsedSummary.analysis}
            initialTags={source.tags ?? []}
            tagSuggestions={tagSuggestions}
            rawInput={summary?.raw_input ?? ""}
            inputModality={summary?.input_modality ?? "text"}
          />

          <div className="source-origin-panel">
            <details className="capture-details source-capture-details">
              <summary>Nayta alkuperainen ajatus</summary>

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
                          <img
                            src={assetUrl(asset.mime_type, asset.base64_data)}
                            alt={asset.file_name}
                            className="capture-asset-preview"
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

                {summary?.raw_input ? <p className="source-capture-raw-text">{summary.raw_input}</p> : null}
              </div>
            </details>
          </div>
        </article>
      </div>

      <article className="card source-editor-card source-task-card">
        <div className="source-origin-header">
          <div className="page-header source-task-card-header">
            <h2>Luo tehtava</h2>
            <p className="muted">
              Tehtava auttaa palaamaan ajatukseen myohemmin. Luo tasta seuraava rauhallinen askel.
            </p>
          </div>
          <form action={generateCardsAction}>
            <input type="hidden" name="sourceId" value={source.id} />
            <SubmitButton className="primary" pendingText="Luodaan tehtavaa..." loadingVariant="idea-network">
              Luo tehtava
            </SubmitButton>
          </form>
        </div>

        <div className="list" style={{ marginTop: "0.8rem" }}>
          {cards.length === 0 ? <div className="source-task-empty" /> : null}

          {cards.map((card, index) => (
            <article className="card" key={card.id}>
              <div className="source-meta">
                <span className="pill" data-variant="primary">
                  {card.card_type}
                </span>
                <span className="pill">{card.status}</span>
              </div>

              <div className="form" style={{ marginTop: "0.7rem" }}>
                <input form="source-editor-form" type="hidden" name={`cards[${index}].cardId`} value={card.id} />
                <label className="form-row">
                  <span>Kysymys</span>
                  <input form="source-editor-form" name={`cards[${index}].prompt`} defaultValue={card.prompt} required />
                </label>
                <label className="form-row">
                  <span>Vastaus</span>
                  <textarea form="source-editor-form" name={`cards[${index}].answer`} defaultValue={card.answer} required />
                </label>
                <label className="form-row">
                  <span>Tyyppi</span>
                  <select form="source-editor-form" name={`cards[${index}].cardType`} defaultValue={card.card_type}>
                    <option value="recall">recall</option>
                    <option value="apply">apply</option>
                    <option value="reflect">reflect</option>
                    <option value="decision">decision</option>
                  </select>
                </label>
              </div>

              <div className="actions" style={{ marginTop: "0.75rem" }}>
                {card.status === "suggested" ? (
                  <form action={setCardStatusAction}>
                    <input type="hidden" name="sourceId" value={source.id} />
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="prompt" value={card.prompt} />
                    <input type="hidden" name="answer" value={card.answer} />
                    <input type="hidden" name="cardType" value={card.card_type} />
                    <input type="hidden" name="status" value="active" />
                    <SubmitButton className="success" pendingText="Hyvaksytaan...">
                      Hyvaksy
                    </SubmitButton>
                  </form>
                ) : null}

                <form action={deleteCardAction}>
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="cardId" value={card.id} />
                  <SubmitButton
                    className="danger"
                    pendingText="Poistetaan..."
                    confirmMessage="Poistetaanko kortti pysyvasti?"
                  >
                    Poista
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      </article>

      <SourcePageActions sourceId={source.id} lastSavedLabel={lastSavedLabel} />
    </section>
  );
}
