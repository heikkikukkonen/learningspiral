import { NextResponse } from "next/server";
import { createSourceFromPreparedCapture } from "@/lib/db";
import { extractTextFromCaptureImage } from "@/lib/llm";
import { inferCaptureTitle } from "@/lib/source-editor";

function redirectTo(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sharedFile = formData.get("image");

    if (!(sharedFile instanceof File) || sharedFile.size === 0) {
      return redirectTo("/capture?mode=image&shareError=missing-file", request);
    }

    const bytes = new Uint8Array(await sharedFile.arrayBuffer());
    const base64Data = Buffer.from(bytes).toString("base64");
    const sharedTitle = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
    const sharedText = typeof formData.get("text") === "string" ? String(formData.get("text")).trim() : "";

    const extracted = await extractTextFromCaptureImage({
      mimeType: sharedFile.type || "image/png",
      base64Data,
      userContext: sharedText
    });

    const rawInputSections = [
      sharedText ? `User note:\n${sharedText}` : "",
      extracted.data.trim() ? `Image text:\n${extracted.data.trim()}` : ""
    ].filter(Boolean);

    const rawInput = rawInputSections.join("\n\n").trim() || "Image capture";

    const source = await createSourceFromPreparedCapture({
      title:
        sharedTitle ||
        inferCaptureTitle(rawInput, sharedFile.name.replace(/\.[^.]+$/, "") || "Jaettu kuva"),
      type: "other",
      rawInput,
      inputModality: "image",
      origin: "Shared from device",
      asset: {
        kind: "image",
        fileName: sharedFile.name || "shared-image",
        mimeType: sharedFile.type || "image/png",
        bytes
      }
    });

    return redirectTo(`/sources/${source.id}?shared=1`, request);
  } catch (error) {
    console.error("[share/image] failed to import shared image", error);
    return redirectTo("/capture?mode=image&shareError=import-failed", request);
  }
}
