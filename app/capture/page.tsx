import Link from "next/link";
import { getSourceWithDetails } from "@/lib/db";
import { InputModality, SourceType } from "@/lib/types";
import { sendCaptureMessageAction, startCaptureAction } from "@/app/capture/actions";

const modalities: InputModality[] = ["text", "image", "audio", "mixed"];
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

export default async function CapturePage({
  searchParams
}: {
  searchParams: { sourceId?: string };
}) {
  const sourceId = searchParams.sourceId;
  let sourceTitle = "";
  let sourcePageUrl = "";
  let messages: Array<{ id: string; role: string; content: string; created_at: string }> = [];
  let summary = "";

  if (sourceId) {
    try {
      const details = await getSourceWithDetails(sourceId);
      sourceTitle = details.source?.title ?? "";
      sourcePageUrl = details.source ? `/sources/${details.source.id}` : "";
      messages = details.captureMessages;
      summary = details.summary?.content ?? "";
    } catch {
      messages = [];
    }
  }

  return (
    <section className="grid">
      <div className="page-header">
        <h1>Capture</h1>
        <p className="muted">One conversation view for input, summary draft and review task generation.</p>
      </div>

      {!sourceId ? (
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Start new capture</h2>
          <form className="form" action={startCaptureAction}>
            <label className="form-row">
              <span>Title (optional)</span>
              <input name="title" placeholder="Example: Thinking in Systems chapter 3" />
            </label>

            <div className="grid grid-cols-2">
              <label className="form-row">
                <span>Input modality</span>
                <select name="inputModality" defaultValue="text">
                  {modalities.map((modality) => (
                    <option key={modality} value={modality}>
                      {modality}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-row">
                <span>Source type</span>
                <select name="sourceType" defaultValue="book">
                  {sourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-row">
              <span>Capture input</span>
              <textarea
                name="rawInput"
                placeholder="Paste notes, transcript, OCR text or your own summary..."
                required
              />
            </label>

            <div className="actions">
              <button type="submit" className="primary">
                Ingest capture
              </button>
            </div>
          </form>
        </article>
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
                <Link className="button-link secondary" href="/capture">
                  New capture
                </Link>
              </div>
            </div>

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
            <h2 style={{ marginTop: 0 }}>Continue conversation</h2>
            <form className="form" action={sendCaptureMessageAction}>
              <input type="hidden" name="sourceId" value={sourceId} />
              <label className="form-row">
                <span>Message</span>
                <textarea
                  name="message"
                  placeholder="Tell the agent what to refine in the summary or what to focus on."
                  required
                />
              </label>
              <div className="actions">
                <button type="submit" className="primary">
                  Send
                </button>
              </div>
            </form>
          </article>

          <article className="card">
            <h2 style={{ marginTop: 0 }}>Latest summary draft</h2>
            <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {summary || "No summary draft yet. Send a message to generate one."}
            </p>
          </article>
        </>
      )}
    </section>
  );
}
