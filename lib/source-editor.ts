export type SourceEditorDraft = {
  idea: string;
  analysis: string;
};

export function normalizeBlock(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function normalizeCaptureSummary(value: string): string {
  const normalized = normalizeBlock(value);
  if (!normalized) {
    return "";
  }

  return normalized.replace(/^Summary draft:\s*/i, "").trim();
}

export function buildSourceSummaryContent(draft: SourceEditorDraft): string {
  const idea = normalizeBlock(draft.idea);
  const analysis = normalizeBlock(draft.analysis);

  if (idea && analysis) {
    return `Idea:\n${idea}\n\nAnalysis:\n${analysis}`;
  }

  return analysis || idea;
}

function titleCaseToken(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function suggestSourceTags(input: {
  title?: string | null;
  idea?: string | null;
  analysis?: string | null;
  rawInput?: string | null;
}): string[] {
  const combined = [input.title, input.idea, input.analysis, input.rawInput]
    .map((value) => normalizeBlock(value ?? ""))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!combined) {
    return [];
  }

  const stopWords = new Set([
    "about",
    "after",
    "alla",
    "because",
    "before",
    "being",
    "could",
    "eivat",
    "ellei",
    "enka",
    "ettei",
    "from",
    "have",
    "ideas",
    "ihan",
    "johon",
    "jolla",
    "jonka",
    "jotka",
    "jotta",
    "kayta",
    "koko",
    "koska",
    "kuinka",
    "miksi",
    "mita",
    "mutta",
    "niiden",
    "niita",
    "siina",
    "sille",
    "sina",
    "siten",
    "sitta",
    "some",
    "tahan",
    "tama",
    "tassa",
    "tasta",
    "that",
    "their",
    "these",
    "tieda",
    "tieto",
    "tulla",
    "tunne",
    "vaikka",
    "where",
    "which",
    "with",
    "yksi"
  ]);

  const matches = combined.match(/\p{L}[\p{L}\p{N}-]{2,}/gu) ?? [];
  const frequencies = new Map<string, number>();
  for (const token of matches) {
    if (stopWords.has(token)) continue;
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fi"))
    .slice(0, 5)
    .map(([token]) => titleCaseToken(token));
}

export function parseSourceSummaryContent(
  content: string | null | undefined,
  rawInput?: string | null
): SourceEditorDraft {
  const normalized = normalizeCaptureSummary(content ?? "");
  if (!normalized) {
    return { idea: normalizeBlock(rawInput ?? ""), analysis: "" };
  }

  const summaryDraftMatch = normalized.match(
    /^([\s\S]*?)(?:\n{2,}Key points:\s*([\s\S]*))$/i
  );
  if (summaryDraftMatch) {
    const idea = normalizeBlock(summaryDraftMatch[1] ?? "");
    const bullets = normalizeBlock(summaryDraftMatch[2] ?? "");
    return {
      idea,
      analysis: bullets || idea
    };
  }

  const match = normalized.match(/Idea:\s*([\s\S]*?)(?:\n{2,}Analysis:\s*([\s\S]*))$/i);
  if (match) {
    return {
      idea: normalizeBlock(match[1] ?? ""),
      analysis: normalizeBlock(match[2] ?? "")
    };
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const fallbackIdea = paragraphs[0] ?? normalizeBlock(rawInput ?? "");
  return {
    idea: fallbackIdea,
    analysis: normalized
  };
}
