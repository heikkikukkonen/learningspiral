import { NextResponse } from "next/server";
import { createSourceFromPreparedCapture } from "@/lib/db";
import { CaptureAssetKind, InputModality, SourceType } from "@/lib/types";

function inferTitle(rawInput: string): string {
  const firstLine = rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || "Untitled capture").slice(0, 90);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      rawInput?: string;
      summary?: string;
      sourceType?: SourceType;
      inputModality?: InputModality;
      origin?: string;
      url?: string;
      asset?: {
        kind: CaptureAssetKind;
        fileName: string;
        mimeType: string;
        base64Data: string;
      } | null;
    };

    const rawInput = (body.rawInput || "").trim();
    const summary = (body.summary || "").trim();

    if (!rawInput || !summary) {
      return NextResponse.json({ error: "Raw input and summary are required." }, { status: 400 });
    }

    const source = await createSourceFromPreparedCapture({
      title: (body.title || "").trim() || inferTitle(rawInput),
      type: body.sourceType || "other",
      rawInput,
      summary,
      inputModality: body.inputModality || "text",
      origin: body.origin?.trim() || undefined,
      url: body.url?.trim() || undefined,
      asset: body.asset
        ? {
            kind: body.asset.kind,
            fileName: body.asset.fileName,
            mimeType: body.asset.mimeType,
            bytes: Uint8Array.from(Buffer.from(body.asset.base64Data, "base64"))
          }
        : undefined
    });

    return NextResponse.json({ sourceId: source.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
