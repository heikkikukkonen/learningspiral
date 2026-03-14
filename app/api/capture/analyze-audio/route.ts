import { NextResponse } from "next/server";
import { generateCaptureSummaryReply, transcribeCaptureAudio } from "@/lib/llm";

function fallbackSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return `Summary draft:\n${normalized.slice(0, 420)}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("audioFile");
    const note = typeof formData.get("note") === "string" ? String(formData.get("note")).trim() : "";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const transcribed = await transcribeCaptureAudio({
      fileName: file.name || "capture-audio.webm",
      mimeType: file.type || "audio/webm",
      bytes
    });

    const rawInput = [
      note ? `User note:\n${note}` : "",
      transcribed.data.trim() ? `Voice transcript:\n${transcribed.data.trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const summaryReply = rawInput
      ? await generateCaptureSummaryReply({
          messages: [{ role: "user", content: rawInput }]
        })
      : { ok: false, data: "" };

    return NextResponse.json({
      rawInput,
      summary: summaryReply.data.trim() || fallbackSummary(rawInput),
      asset: {
        kind: "audio",
        fileName: file.name || "capture-audio.webm",
        mimeType: file.type || "audio/webm",
        fileSize: file.size,
        base64Data: Buffer.from(bytes).toString("base64")
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
