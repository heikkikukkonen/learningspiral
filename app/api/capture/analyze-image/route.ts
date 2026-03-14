import { NextResponse } from "next/server";
import { extractTextFromCaptureImage, generateCaptureSummaryReply } from "@/lib/llm";

function fallbackSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return `Summary draft:\n${normalized.slice(0, 420)}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("imageFile");
    const note = typeof formData.get("note") === "string" ? String(formData.get("note")).trim() : "";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64Data = Buffer.from(bytes).toString("base64");

    const extracted = await extractTextFromCaptureImage({
      mimeType: file.type || "image/png",
      base64Data,
      userContext: note
    });

    const rawInput = [
      note ? `User note:\n${note}` : "",
      extracted.data.trim() ? `Image interpretation:\n${extracted.data.trim()}` : ""
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
        kind: "image",
        fileName: file.name,
        mimeType: file.type || "image/png",
        fileSize: file.size,
        base64Data
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
