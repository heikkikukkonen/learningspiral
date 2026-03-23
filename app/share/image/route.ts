import { NextResponse } from "next/server";
import { createSharedCaptureImport } from "@/lib/shared-capture-imports";

function redirectTo(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  let targetMode: "text" | "image" = "text";

  try {
    const formData = await request.formData();
    const sharedFile = formData.get("image");
    const sharedTitle = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
    const sharedText = typeof formData.get("text") === "string" ? String(formData.get("text")).trim() : "";
    const sharedUrl = typeof formData.get("url") === "string" ? String(formData.get("url")).trim() : "";

    if (sharedFile instanceof File && sharedFile.size > 0) {
      targetMode = "image";
      const bytes = new Uint8Array(await sharedFile.arrayBuffer());
      const sharedImportId = await createSharedCaptureImport({
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

    const sharedImportId = await createSharedCaptureImport({
      fileName: "shared-text.txt",
      mimeType: "text/plain",
      sharedTitle,
      sharedText,
      sharedUrl
    });

    return redirectTo(`/capture?mode=text&sharedImport=${encodeURIComponent(sharedImportId)}`, request);
  } catch (error) {
    console.error("[share/image] failed to import shared content", error);
    return redirectTo(`/capture?mode=${targetMode}&shareError=import-failed`, request);
  }
}
