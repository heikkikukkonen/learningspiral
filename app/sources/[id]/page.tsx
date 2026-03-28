import { notFound } from "next/navigation";
import { SourceEditorForm } from "@/app/sources/[id]/source-editor-form";
import { SourcePageActions } from "@/app/sources/[id]/source-page-actions";
import { SourceTasksPanel } from "@/app/sources/[id]/source-tasks-panel";
import { getSourceWithDetails, getUserSettings, listUserTagStats } from "@/lib/db";
import { parseSourceSummaryContent } from "@/lib/source-editor";
import { sourceIdeaStageLabel } from "@/lib/source-status";
import { CardType, IdeaStatus, SourceType, TagSuggestion } from "@/lib/types";

type SourceDetails = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  url: string | null;
  tags: string[] | null;
  capture_mode: string;
  idea_status: IdeaStatus;
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
  let settings = null as Awaited<ReturnType<typeof getUserSettings>> | null;
  let loadError = "";

  try {
    const [result, userTags, userSettings] = await Promise.all([
      getSourceWithDetails(params.id),
      listUserTagStats(),
      getUserSettings()
    ]);
    source = result.source;
    summary = result.summary;
    cards = result.cards;
    captureAssets = result.captureAssets;
    tagSuggestions = userTags;
    settings = userSettings;
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
          <strong>Tietokanta ei ole yhteydessä</strong>
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
    : "Ei tallennettu vielä";
  const hasCards = cards.length > 0;
  const sourceStageLabel = sourceIdeaStageLabel(source.idea_status);

  return (
    <section className="grid source-workspace">
      <div className="page-header source-workspace-header">
        <h1>Työstä ajatusta</h1>
        <div className="source-workspace-status">
          <span className="pill">{sourceStageLabel}</span>
          {!hasCards ? (
            <p className="muted">
              Tällä sivulla jatkat tallentamasi merkityksellisen ajatuksen työstämistä ja teet
              siitä helpommin löydettävän ja hyödynnettävän. Kirkasta ensin ajatuksen ydin, lisää
              tunnisteet ja luo ainakin yksi tehtävä.
            </p>
          ) : (
            <p className="muted">
              Tällä sivulla jatkat tallentamasi merkityksellisen ajatuksen työstämistä ja teet
              siitä helpommin löydettävän ja hyödynnettävän. Voit jatkaa ajatuksen kehittämistä ja
              muokata sen sisältöjä milloin tahansa.
            </p>
          )}
        </div>
      </div>

      <div className="source-workspace-layout">
        <article className="card source-editor-card">
          <div className="source-editor-topbar">
            <div className="source-meta">
              {sourceTypeLabel(source.type) ? (
                <span className="pill">{sourceTypeLabel(source.type)}</span>
              ) : null}
              {captureModeLabel(source.capture_mode) ? (
                <span className="pill">{captureModeLabel(source.capture_mode)}</span>
              ) : null}
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
            showDebug={settings?.showDebug ?? false}
            captureDetails={
              <div className="source-origin-panel source-origin-panel-inline">
                <details className="capture-details source-capture-details">
                  <summary>
                    <span className="source-capture-summary-closed">Näytä alkuperäinen tallenne</span>
                    <span className="source-capture-summary-open">Piilota alkuperäinen tallenne</span>
                  </summary>

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

                    {summary?.raw_input ? (
                      <p className="source-capture-raw-text">{summary.raw_input}</p>
                    ) : null}
                  </div>
                </details>
              </div>
            }
          />
          <section className="source-form-section source-task-card">
            <div className="source-form-section-header">
              <h2>Tehtävät</h2>
              <p className="muted">
                Luo haluamasi tehtävät palataksesi ajatukseen myöhemmin. Voit muokata toimintojen
                ohjeistusta Asetukset-sivulla.
              </p>
            </div>
            <div className="source-form-section-body">
              <SourceTasksPanel
                sourceId={source.id}
                cards={cards}
                showDebug={settings?.showDebug ?? false}
              />
            </div>
          </section>
        </article>
      </div>

      <SourcePageActions
        sourceId={source.id}
        lastSavedLabel={lastSavedLabel}
      />
    </section>
  );
}
