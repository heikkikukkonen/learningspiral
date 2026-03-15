import { NextResponse } from "next/server";
import { generateCaptureSummaryReply } from "@/lib/llm";
import { normalizeCaptureSummary } from "@/lib/source-editor";

function fallbackSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  return [
    normalized.slice(0, 420),
    "",
    "Key points:",
    "- Mita tassa ideassa kannattaa kirkastaa seuraavaksi?",
    "- Mihin konkreettiseen paatokseen tai kokeiluun tama voisi johtaa?"
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const rawInput = (body.text || "").trim();

    if (!rawInput) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const summaryReply = await generateCaptureSummaryReply({
      messages: [{ role: "user", content: rawInput }]
    });

    return NextResponse.json({
      rawInput,
      summary: normalizeCaptureSummary(summaryReply.data) || fallbackSummary(rawInput)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
