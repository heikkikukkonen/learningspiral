import Image from "next/image";
import Link from "next/link";
import { getSourceWithDetails } from "@/lib/db";
import { CaptureMode, CaptureRole, SourceType } from "@/lib/types";
import {
  deleteCaptureAction,
  sendCaptureMessageAction,
  startCaptureAction
} from "@/app/capture/actions";
import { SubmitButton } from "@/app/components/submit-button";

const captureModes: Array<{
  id: CaptureMode;
  label: string;
  title: string;
  description: string;
}> = [
  {
    id: "text",
    label: "Capture text",
    title: "Save a thought in text",
    description: "Best for fast notes, conversation takeaways, and copied snippets."
  },
  {
    id: "image",
    label: "Capture image",
    title: "Turn an image into usable notes",
    description: "Upload a screenshot or photo and optionally add a quick note."
  },
  {
    id: "voice",
    label: "Capture voice",
    title: "Speak the idea out loud",
    description: "Upload a voice note and we will turn it into text for refinement."
  },
  {
    id: "url",
    label: "Capture URL & text",
    title: "Save a link with your own context",
    description: "Best for articles, posts, and ideas found while browsing."
  }
];

const sourceTypes: SourceType[] = [
  "book",
  "podcast",
  "conversation",
  "thought",
  "article",
  "video",
  "other"
];

export const dynamic = "force-dynamic";

function modeHref(mode: CaptureMode): string {
  return `/capture?mode=${mode}`;
}

function assetUrl(mimeType: string, base64Data: string): string {
  return `data:${mimeType};base64,${base64Data}`;
}

export default async function CapturePage({
  searchParams
}: {
  searchParams: { sourceId?: string; mode?: string };
}) {
  const sourceId = searchParams.sourceId;
  const selectedMode = (captureModes.find((mode) => mode.id === searchParams.mode)?.id ??
    "text") as CaptureMode;
  const selectedModeInfo = captureModes.find((mode) => mode.id === selectedMode) ?? captureModes[0];

  let sourceTitle = "";
  let sourcePageUrl = "";
  let messages: Array<{ id: string; role: CaptureRole; content: string; created_at: string }> = [];
  let assets: Array<{
    id: string;
    kind: "image" | "audio";
    file_name: string;
    mime_type: string;
    file_size: number;
    base64_data: string;
    created_at: string;
  }> = [];
  let summary = "";
  let summarySource: "manual" | "chatgpt" | "" = "";

  if (sourceId) {
    try {
      const details = await getSourceWithDetails(sourceId);
      sourceTitle = details.source?.title ?? "";
      sourcePageUrl = details.source ? `/sources/${details.source.id}` : "";
      messages = details.captureMessages;
      assets = details.captureAssets;
      summary = details.summary?.content ?? "";
      summarySource = details.summary?.source ?? "";
    } catch {
      messages = [];
    }
  }

  return (
    <section className="grid">
      <div className="page-header">
        <h1>Capture</h1>
        <p className="muted">Choose the easiest way to save the idea. We can structure it after.</p>
      </div>

      {!sourceId ? (
        <>
          <article className="card">
            <div className="capture-mode-grid">
              {captureModes.map((mode) => (
                <Link
                  key={mode.id}
                  href={modeHref(mode.id)}
                  className={`capture-mode-card${selectedMode === mode.id ? " is-active" : ""}`}
                >
                  <strong>{mode.label}</strong>
                  <span>{mode.description}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="card capture-entry-card">
            <div className="capture-intro">
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.45rem" }}>{selectedModeInfo.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {selectedModeInfo.description}
                </p>
              </div>
            </div>

            <form className="form" action={startCaptureAction}>
              <input type="hidden" name="captureMode" value={selectedMode} />

              {selectedMode === "text" ? (
                <label className="form-row capture-primary-field">
                  <span>What do you want to save?</span>
                  <textarea
                    name="rawInput"
                    placeholder="Write the idea, quote, conversation takeaway, or rough note here..."
                    required
                  />
                </label>
              ) : null}

              {selectedMode === "image" ? (
                <>
                  <label className="form-row">
                    <span>Image or screenshot</span>
                    <input name="imageFile" type="file" accept="image/*" required />
                  </label>
                  <label className="form-row">
                    <span>Optional note</span>
                    <textarea
                      name="rawInput"
                      placeholder="Add a short note about why this image matters or what to focus on."
                    />
                  </label>
                </>
              ) : null}

              {selectedMode === "voice" ? (
                <>
                  <label className="form-row">
                    <span>Voice note</span>
                    <input name="audioFile" type="file" accept="audio/*" required />
                  </label>
                  <label className="form-row">
                    <span>Optional note</span>
                    <textarea
                      name="rawInput"
                      placeholder="Add context if the voice note refers to a specific meeting, book, or situation."
                    />
                  </label>
                </>
              ) : null}

              {selectedMode === "url" ? (
                <>
                  <label className="form-row">
                    <span>Source URL</span>
                    <input name="url" type="url" placeholder="https://..." required />
                  </label>
                  <label className="form-row capture-primary-field">
                    <span>What was interesting here?</span>
                    <textarea
                      name="rawInput"
                      placeholder="Write the key point, why it matters, or what you want to remember."
                      required
                    />
                  </label>
                </>
              ) : null}

              <details className="capture-details">
                <summary>Add optional context</summary>
                <div className="grid" style={{ marginTop: "0.9rem" }}>
                  <label className="form-row">
                    <span>Title</span>
                    <input name="title" placeholder="Optional short title for this idea" />
                  </label>

                  <div className="grid grid-cols-2">
                    <label className="form-row">
                      <span>Source note</span>
                      <input name="origin" placeholder="Podcast, conversation, book chapter..." />
                    </label>
                    <label className="form-row">
                      <span>Source type</span>
                      <select name="sourceType" defaultValue="other">
                        {sourceTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </details>

              <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <p className="status" style={{ margin: 0 }}>
                  Keep it rough. Images and voice notes are turned into text automatically.
                </p>
                <SubmitButton className="primary" pendingText="Saving...">
                  Save capture
                </SubmitButton>
              </div>
            </form>
          </article>
        </>
      ) : (
        <>
          <article className="card">
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>{sourceTitle || "Capture thread"}</h2>
              <div className="actions">
                {sourcePageUrl ? (
                  <Link className="button-link secondary" href={sourcePageUrl}>
                    Open source details
                  </Link>
                ) : null}
                <form action={deleteCaptureAction}>
                  <input type="hidden" name="sourceId" value={sourceId} />
                  <SubmitButton
                    className="danger"
                    pendingText="Deleting..."
                    confirmMessage="Delete this capture permanently? This also removes its cards and review answers."
                  >
                    Delete capture
                  </SubmitButton>
                </form>
                <Link className="button-link secondary" href="/capture">
                  New capture
                </Link>
              </div>
            </div>

            {assets.length > 0 ? (
              <div className="list" style={{ marginTop: "1rem" }}>
                {assets.map((asset) => (
                  <article key={asset.id} className="card">
                    <div className="source-meta" style={{ marginBottom: "0.7rem" }}>
                      <span className="pill" data-variant="primary">
                        {asset.kind}
                      </span>
                      <span>{asset.file_name}</span>
                      <span>{Math.max(1, Math.round(asset.file_size / 1024))} KB</span>
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
                        className="capture-audio-player"
                        controls
                        src={assetUrl(asset.mime_type, asset.base64_data)}
                      />
                    )}
                  </article>
                ))}
              </div>
            ) : null}

            <div className="list" style={{ marginTop: "1rem" }}>
              {messages.map((item) => (
                <article key={item.id} className="card">
                  <div className="source-meta">
                    <span className="pill" data-variant={item.role === "assistant" ? "primary" : undefined}>
                      {item.role}
                    </span>
                    <span>{new Date(item.created_at).toLocaleString("fi-FI")}</span>
                  </div>
                  <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{item.content}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="card">
            <h2 style={{ marginTop: 0 }}>Refine the idea</h2>
            <form className="form" action={sendCaptureMessageAction}>
              <input type="hidden" name="sourceId" value={sourceId} />
              <label className="form-row">
                <span>What should be clarified next?</span>
                <textarea
                  name="message"
                  placeholder="Ask for a clearer explanation, a tighter summary, key takeaways, tags, or what makes this useful."
                  required
                />
              </label>
              <div className="actions">
                <SubmitButton className="primary" pendingText="Sending...">
                  Send
                </SubmitButton>
              </div>
            </form>
          </article>

          <article className="card">
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Current understanding</h2>
              {summarySource ? (
                <span className="pill" data-variant={summarySource === "chatgpt" ? "primary" : undefined}>
                  {summarySource === "chatgpt" ? "LLM" : "Fallback"}
                </span>
              ) : null}
            </div>
            <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {summary || "No refined summary yet. Continue the conversation to shape this idea."}
            </p>
          </article>
        </>
      )}
    </section>
  );
}
