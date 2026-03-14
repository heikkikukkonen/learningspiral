import Image from "next/image";
import Link from "next/link";
import { getSourceWithDetails } from "@/lib/db";
import { CaptureRole } from "@/lib/types";
import { deleteCaptureAction, sendCaptureMessageAction } from "@/app/capture/actions";
import { CaptureComposer } from "@/app/capture/capture-composer";
import { SubmitButton } from "@/app/components/submit-button";

function assetUrl(mimeType: string, base64Data: string): string {
  return `data:${mimeType};base64,${base64Data}`;
}

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams
}: {
  searchParams: { sourceId?: string };
}) {
  const sourceId = searchParams.sourceId;
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
        <p className="muted">Save the idea first. Structure and review can come after.</p>
      </div>

      {!sourceId ? (
        <CaptureComposer />
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
