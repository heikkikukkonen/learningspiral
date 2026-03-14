export type SourceEditorDraft = {
  idea: string;
  analysis: string;
};

function normalizeBlock(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function buildSourceSummaryContent(draft: SourceEditorDraft): string {
  const idea = normalizeBlock(draft.idea);
  const analysis = normalizeBlock(draft.analysis);

  if (idea && analysis) {
    return `Idea:\n${idea}\n\nAnalysis:\n${analysis}`;
  }

  return analysis || idea;
}

export function parseSourceSummaryContent(content: string | null | undefined): SourceEditorDraft {
  const normalized = normalizeBlock(content ?? "");
  if (!normalized) {
    return { idea: "", analysis: "" };
  }

  const match = normalized.match(/Idea:\s*([\s\S]*?)(?:\n{2,}Analysis:\s*([\s\S]*))$/i);
  if (match) {
    return {
      idea: normalizeBlock(match[1] ?? ""),
      analysis: normalizeBlock(match[2] ?? "")
    };
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return {
    idea: paragraphs[0] ?? "",
    analysis: normalized
  };
}
