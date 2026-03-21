import type { TagSuggestion } from "@/lib/types";

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

export function inferCaptureTitle(rawInput: string, fallback = "Untitled capture"): string {
  const firstLine = normalizeBlock(rawInput)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine || fallback).slice(0, 90);
}

export function buildSourceSummaryContent(draft: SourceEditorDraft): string {
  const idea = normalizeBlock(draft.idea);
  const analysis = normalizeBlock(draft.analysis);

  if (idea && analysis) {
    return `Idea:\n${idea}\n\nAnalysis:\n${analysis}`;
  }

  return analysis || idea;
}

export function normalizeTagValue(value: string): string {
  return normalizeBlock(value)
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fi-FI");
}

export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const tag of tags) {
    const trimmed = normalizeBlock(tag).replace(/^#+/, "").trim();
    const normalized = normalizeTagValue(trimmed);
    if (!trimmed || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(trimmed);
  }

  return unique;
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

function tokenizeForTagMatch(value: string): string[] {
  return normalizeBlock(value)
    .toLocaleLowerCase("fi-FI")
    .match(/\p{L}[\p{L}\p{N}-]{1,}/gu) ?? [];
}

export function selectRelevantExistingTags(input: {
  title?: string | null;
  idea?: string | null;
  analysis?: string | null;
  rawInput?: string | null;
  existingTags?: TagSuggestion[];
  limit?: number;
}): string[] {
  const tagOptions = input.existingTags ?? [];
  if (!tagOptions.length) return [];

  const combined = [input.title, input.idea, input.analysis, input.rawInput]
    .map((value) => normalizeBlock(value ?? ""))
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fi-FI");

  if (!combined) return [];

  const tokens = new Set(tokenizeForTagMatch(combined));

  return [...tagOptions]
    .map((option) => {
      const normalizedTag = normalizeTagValue(option.tag);
      const tagTokens = tokenizeForTagMatch(option.tag);
      const overlapScore = tagTokens.reduce(
        (score, token) => score + (tokens.has(token) ? 2 : combined.includes(token) ? 1 : 0),
        0
      );
      const phraseScore = combined.includes(normalizedTag) ? 4 : 0;
      return {
        option,
        score: overlapScore + phraseScore
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.option.usageCount - left.option.usageCount ||
        right.option.lastUsedAt.localeCompare(left.option.lastUsedAt) ||
        left.option.tag.localeCompare(right.option.tag, "fi-FI")
    )
    .slice(0, input.limit ?? 5)
    .map((item) => item.option.tag);
}

export function parseSourceSummaryContent(
  content: string | null | undefined,
  rawInput?: string | null
): SourceEditorDraft {
  const normalized = normalizeCaptureSummary(content ?? "");
  const normalizedRawInput = normalizeBlock(rawInput ?? "");
  if (!normalized) {
    return { idea: normalizedRawInput, analysis: "" };
  }

  if (normalizedRawInput && normalized === normalizedRawInput) {
    return {
      idea: normalizedRawInput,
      analysis: ""
    };
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

  const fallbackIdea = normalizedRawInput || normalized;
  return {
    idea: fallbackIdea,
    analysis: normalized
  };
}
