import { NextResponse } from "next/server";
import { createSourceFromPreparedCapture } from "@/lib/db";
import { inferCaptureTitle } from "@/lib/source-editor";
import { createSharedImageImport } from "@/lib/shared-capture-imports";

function redirectTo(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sharedFile = formData.get("image");
    const sharedTitle = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
    const sharedText = typeof formData.get("text") === "string" ? String(formData.get("text")).trim() : "";
    const sharedUrl = typeof formData.get("url") === "string" ? String(formData.get("url")).trim() : "";

    if (sharedFile instanceof File && sharedFile.size > 0) {
      const bytes = new Uint8Array(await sharedFile.arrayBuffer());
      const sharedImportId = await createSharedImageImport({
        fileName: sharedFile.name || "shared-image",
        mimeType: sharedFile.type || "image/png",
        bytes,
        sharedTitle,
        sharedText,
        sharedUrl
      });

      return redirectTo(`/capture?mode=image&sharedImport=${encodeURIComponent(sharedImportId)}`, request);
    }

    if (!sharedText && !sharedUrl && !sharedTitle) {
      return redirectTo("/capture?mode=image&shareError=missing-file", request);
    }

    const rawInputSections = [
      sharedUrl ? `Source URL:\n${sharedUrl}` : "",
      sharedText ? `Shared text:\n${sharedText}` : ""
    ].filter(Boolean);

    const rawInput = rawInputSections.join("\n\n").trim();

    const source = await createSourceFromPreparedCapture({
      title: sharedTitle || inferCaptureTitle(rawInput, sharedUrl || "Jaettu sisalto"),
      type: "other",
      rawInput,
      inputModality: "text",
      origin: "Shared from device",
      url: sharedUrl || undefined
    });

    return redirectTo(`/sources/${source.id}?shared=1`, request);
  } catch (error) {
    console.error("[share/image] failed to import shared image", error);
    return redirectTo("/capture?mode=image&shareError=import-failed", request);
  }
}
