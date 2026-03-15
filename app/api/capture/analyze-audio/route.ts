import { NextResponse } from "next/server";
import { transcribeCaptureAudio } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("audioFile");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const transcribed = await transcribeCaptureAudio({
      fileName: file.name || "capture-audio.webm",
      mimeType: file.type || "audio/webm",
      bytes
    });

    const rawInput = transcribed.data.trim();

    return NextResponse.json({
      rawInput,
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
