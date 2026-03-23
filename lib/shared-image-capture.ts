export type SharedImageCaptureContext = {
  sharedTitle?: string;
  sharedText?: string;
  sharedUrl?: string;
};

function normalizeSharedValue(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed || undefined;
}

export function normalizeSharedImageCaptureContext(
  input: SharedImageCaptureContext | null | undefined
): SharedImageCaptureContext | null {
  const normalized: SharedImageCaptureContext = {
    sharedTitle: normalizeSharedValue(input?.sharedTitle),
    sharedText: normalizeSharedValue(input?.sharedText),
    sharedUrl: normalizeSharedValue(input?.sharedUrl)
  };

  return hasSharedImageCaptureContext(normalized) ? normalized : null;
}

export function hasSharedImageCaptureContext(
  input: SharedImageCaptureContext | null | undefined
): input is SharedImageCaptureContext {
  return Boolean(input?.sharedTitle || input?.sharedText || input?.sharedUrl);
}

export function buildSharedImageUserContext(input: SharedImageCaptureContext | null | undefined): string {
  return [input?.sharedTitle, input?.sharedText, input?.sharedUrl].filter(Boolean).join("\n");
}

export function buildSharedImageRawInput(
  input: SharedImageCaptureContext | null | undefined,
  extractedText: string
): string {
  const sections = [
    input?.sharedUrl ? `Source URL:\n${input.sharedUrl}` : "",
    input?.sharedText ? `User note:\n${input.sharedText}` : "",
    extractedText.trim() ? `Image text:\n${extractedText.trim()}` : ""
  ].filter(Boolean);

  return sections.join("\n\n").trim() || "Image capture";
}
