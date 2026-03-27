import { NextResponse } from "next/server";
import { extractTextFromCaptureImage } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("imageFile");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64Data = Buffer.from(bytes).toString("base64");

    const extracted = await extractTextFromCaptureImage({
      mimeType: file.type || "image/png",
      base64Data,
      userContext: typeof formData.get("note") === "string" ? String(formData.get("note")).trim() : ""
    });

    const rawInput = extracted.data.trim();
    if (!extracted.ok || !rawInput) {
      return NextResponse.json(
        { error: "Kuvan litterointi ei ole käytettävissä, koska yhteys palveluun ei toimi." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      rawInput,
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
