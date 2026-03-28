import { getAnalysisPrompt } from "@/lib/analysis-actions";
import type { AnalysisMode } from "@/lib/analysis-actions";
import { CardType } from "@/lib/types";
import type { TagSuggestion } from "@/lib/types";
import {
  dedupeTags,
  normalizeBlock,
  normalizeCaptureSummary,
  normalizeTagValue,
  selectRelevantExistingTags,
  suggestSourceTags
} from "@/lib/source-editor";
import {
  DEFAULT_TAG_GENERATION_PROMPT,
  buildLanguageInstruction,
  UserSettings
} from "@/lib/user-settings";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeneratedCard {
  cardType: CardType;
  prompt: string;
  answer: string;
}

export interface LlmResult<T> {
  ok: boolean;
  data: T;
  model?: string;
  debugPrompt?: string;
}

export interface RefinedSourceDraft {
  title: string;
  idea: string;
  analysis: string;
  tags: string[];
}

interface RefinedAnalysisPayload {
  analysis: string;
}

interface GeneratedTagsPayload {
  tags: string[];
}

function alignTagsToExisting(tags: string[], existingTags: TagSuggestion[] = []): string[] {
  if (!existingTags.length) {
    return dedupeTags(tags);
  }

  const existingByNormalized = new Map(
    existingTags.map((tag) => [normalizeTagValue(tag.tag), tag.tag] as const)
  );

  return dedupeTags(
    tags.map((tag) => existingByNormalized.get(normalizeTagValue(tag)) ?? tag)
  );
}

function appendOptionalInstruction(lines: string[], instruction?: string) {
  const normalized = (instruction || "").trim();
  if (!normalized) return lines;
  return [...lines, normalized];
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function getApiKey(): string {
  return process.env.OPENAI_API_KEY || "";
}

export function isLlmConfigured(): boolean {
  return Boolean(getApiKey());
}

function extractTextFromResponse(json: unknown): string {
  if (!json || typeof json !== "object") return "";

  const topLevel = (json as { output_text?: unknown }).output_text;
  if (typeof topLevel === "string" && topLevel.trim()) {
    return topLevel.trim();
  }

  const output = (json as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        chunks.push(text.trim());
      }
    }
  }

  return chunks.join("\n").trim();
}

async function callResponsesApi(messages: ChatMessage[]): Promise<{ text: string; model?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getModel(),
      input: messages.map((message) => ({
        role: message.role,
        content: [
          {
            type: message.role === "assistant" ? "output_text" : "input_text",
            text: message.content
          }
        ]
      })),
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as {
    output_text?: string;
    model?: string;
    output?: unknown;
  };
  const extractedText = extractTextFromResponse(json);

  if (!extractedText) {
    console.warn("[llm-warning] responses_api_empty_text", {
      model: json.model,
      response_shape: {
        has_output_text: typeof json.output_text === "string",
        has_output_array: Array.isArray(json.output)
      }
    });
  }

  return {
    text: extractedText,
    model: json.model
  };
}

async function callResponsesApiWithInput(
  input: Array<{ role: "system" | "user" | "assistant"; content: Array<Record<string, unknown>> }>
): Promise<{ text: string; model?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getModel(),
      input,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as {
    output_text?: string;
    model?: string;
    output?: unknown;
  };

  return {
    text: extractTextFromResponse(json),
    model: json.model
  };
}

function sanitizeCard(input: Partial<GeneratedCard>): GeneratedCard | null {
  const allowedTypes: CardType[] = ["recall", "apply", "reflect", "discuss", "decision", "custom"];
  const cardType = input.cardType;
  const prompt = (input.prompt || "").trim();
  const answer = (input.answer || "").trim();

  if (!cardType || !allowedTypes.includes(cardType)) return null;
  if (!prompt || !answer) return null;

  return {
    cardType,
    prompt: prompt.slice(0, 500),
    answer: answer.slice(0, 800)
  };
}

function sanitizeRefinedSourceDraft(input: Partial<RefinedSourceDraft>): RefinedSourceDraft | null {
  const title = normalizeBlock(input.title || "");
  const idea = normalizeBlock(input.idea || "");
  const analysis = formatRefinedAnalysis(input.analysis || "");
  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((tag) => normalizeBlock(typeof tag === "string" ? tag : ""))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (!title || !idea || !analysis) {
    return null;
  }

  return {
    title: title.slice(0, 120),
    idea: idea.slice(0, 2000),
    analysis: analysis.slice(0, 5000),
    tags
  };
}

function formatRefinedAnalysis(value: string): string {
  const normalized = normalizeBlock(value).replace(/\n{3,}/g, "\n\n");
  if (!normalized) {
    return "";
  }

  const hasExplicitParagraphs = /\n\s*\n/.test(normalized);
  const hasStructuredLines = /(^|\n)([-*]|\d+\.)\s/m.test(normalized);

  if (hasExplicitParagraphs || hasStructuredLines) {
    return normalized;
  }

  const compact = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  const sentences =
    compact
      .match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

  if (sentences.length < 4) {
    return compact;
  }

  const chunkSize = sentences.length >= 7 ? 3 : 2;
  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += chunkSize) {
    paragraphs.push(sentences.slice(index, index + chunkSize).join(" "));
  }

  return paragraphs.join("\n\n").trim();
}

function sanitizeRefinedAnalysis(input: Partial<RefinedAnalysisPayload>): RefinedAnalysisPayload | null {
  const analysis = formatRefinedAnalysis(input.analysis || "");

  if (!analysis) {
    return null;
  }

  return {
    analysis: analysis.slice(0, 5000)
  };
}

function sanitizeGeneratedTags(input: Partial<GeneratedTagsPayload>): GeneratedTagsPayload | null {
  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((tag) => normalizeBlock(typeof tag === "string" ? tag : ""))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (tags.length === 0) {
    return null;
  }

  return {
    tags: Array.from(new Set(tags))
  };
}

function sentenceSplit(value: string): string[] {
  return normalizeBlock(value)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fallbackRefinedSourceDraft(input: {
  mode: AnalysisMode | "custom";
  title: string;
  idea: string;
  analysis: string;
  rawInput: string;
  tags: string[];
  customInstruction?: string;
}): RefinedSourceDraft {
  const title = normalizeBlock(input.title) || "Untitled idea";
  const idea = normalizeBlock(input.idea) || normalizeBlock(input.rawInput) || title;
  const analysis = normalizeBlock(input.analysis) || idea;
  const ideaSentences = sentenceSplit(idea);
  const analysisSentences = sentenceSplit(analysis);
  const customInstruction = normalizeBlock(input.customInstruction || "");

  let nextAnalysis = analysis;
  if (input.mode === "clarify") {
    nextAnalysis = [
      `Ydinajatus on ${ideaSentences[0] || idea}.`,
      "Tama auttaa nakemaan nopeammin, mita olet oikeastaan sanomassa, miksi se on tarkea ja mika viestin punainen lanka on."
    ]
      .join(" ")
      .trim();
  } else if (input.mode === "deepen") {
    nextAnalysis = [
      analysis,
      "",
      "Syvennys:",
      "- Mita uusi nakokulma avaa tai haastaa taman ajatuksen sisalla?",
      "- Mihin laajempaan ilmioon, esimerkkiin tai kaytannon tilanteeseen tama liittyy?",
      "- Mita kysymysta kannattaa pohtia seuraavaksi?"
    ]
      .join("\n")
      .trim();
  } else if (input.mode === "condense") {
    nextAnalysis = analysisSentences.slice(0, 2).join(" ");
    if (!nextAnalysis) {
      nextAnalysis = ideaSentences.slice(0, 2).join(" ") || idea;
    }
  } else if (input.mode === "network") {
    nextAnalysis = [
      "Aihetta kannattaisi syventaa ainakin muutaman erilaisen ihmisen kanssa:",
      "- Kaytannon tekija, joka kohtaa aiheen arjessa ja voi kertoa missa se toimii tai ei toimi.",
      "- Asiantuntija tai tutkija, joka osaa liittaa ajatuksen laajempaan tietoon ja aiempiin havaintoihin.",
      "- Luotettu keskustelukumppani, joka uskaltaa haastaa ajatusta ja tehda piilevat oletukset nakyviksi."
    ].join("\n");
  } else if (customInstruction) {
    nextAnalysis = [
      analysis,
      "",
      "Oma syvennys:",
      customInstruction,
      "",
      "Jatka aihetta taman suunnan pohjalta nostamalla esiin yksi uusi nakokulma, yksi tarkentava kysymys ja yksi konkreettinen seuraava askel."
    ]
      .join("\n")
      .trim();
  }

  const nextTags = Array.from(
    new Set([
      ...input.tags,
      ...suggestSourceTags({
        title,
        idea,
        analysis: nextAnalysis,
        rawInput: input.rawInput
      })
    ])
  ).slice(0, 6);

  return {
    title,
    idea,
    analysis: nextAnalysis,
    tags: nextTags
  };
}

export async function generateCaptureSummaryReply(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  settings?: UserSettings;
}): Promise<LlmResult<string>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: "" };
  }

  const systemPrompt = appendOptionalInstruction([
    "You are a learning capture assistant.",
    buildLanguageInstruction(input.settings?.responseLanguage || "Finnish"),
    "Keep the writing concise.",
    "Goal: produce a practical summary draft the user can edit.",
    "Always include this structure:",
    "<2-5 concise sentences>",
    "",
    "Key points:",
    "- bullet 1",
    "- bullet 2",
    "- bullet 3",
    "",
    "Focus on concrete decisions, actions, and why this matters now."
  ]).join("\n");

  const recentMessages = input.messages.slice(-10);
  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  ]);

  return {
    ok: Boolean(reply.text),
    data: normalizeCaptureSummary(reply.text),
    model: reply.model
  };
}

export async function extractTextFromCaptureImage(input: {
  mimeType: string;
  base64Data: string;
  userContext?: string;
}): Promise<LlmResult<string>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: "" };
  }

  const reply = await callResponsesApiWithInput([
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text: [
            "You are a learning capture assistant.",
            "Write in concise Finnish.",
            "Convert the image into editable plain text for later source refinement.",
            "If there is text in the image, transcribe it as faithfully as possible.",
            "Correct only obvious OCR mistakes or broken words when confidence is high.",
            "If there is a diagram, UI, or visual concept with little text, describe only what is explicitly visible.",
            "Do not summarize, infer hidden intent, or add recommendations.",
            "Return plain text only."
          ].join("\n")
        }
      ]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: input.userContext?.trim()
            ? `Additional context from user:\n${input.userContext.trim()}`
            : "Turn this image into usable capture text."
        },
        {
          type: "input_image",
          image_url: `data:${input.mimeType};base64,${input.base64Data}`
        }
      ]
    }
  ]);

  return { ok: Boolean(reply.text), data: reply.text, model: reply.model };
}

export async function transcribeCaptureAudio(input: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<LlmResult<string>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: "" };
  }

  const apiKey = getApiKey();
  const form = new FormData();
  const blob = new Blob([input.bytes], { type: input.mimeType || "audio/webm" });
  form.append("file", blob, input.fileName || "capture-audio.webm");
  form.append("model", "gpt-4o-mini-transcribe");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI transcription failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { text?: string };
  const text = (json.text || "").trim();
  return { ok: Boolean(text), data: text };
}

export async function generateReviewCardsFromSummary(input: {
  summary: string;
  rawInput: string;
  settings?: UserSettings;
}): Promise<LlmResult<GeneratedCard[]>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: [] };
  }

  const systemPrompt = appendOptionalInstruction([
    "You generate learning review cards.",
    buildLanguageInstruction(input.settings?.responseLanguage || "Finnish"),
    "Return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "cards": [',
    '    {"cardType":"recall|apply|reflect|decision","prompt":"...","answer":"..."}',
    "  ]",
    "}",
    "Generate exactly 4 cards, one per type: recall, apply, reflect, decision."
  ], input.settings?.cardGenerationPrompt).join("\n");

  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        "Generate cards using both the original capture and the refined summary.",
        "",
        "Original capture:",
        input.rawInput || "(none)",
        "",
        "Summary:",
        input.summary
      ].join("\n")
    }
  ]);

  let parsed: { cards?: Partial<GeneratedCard>[] } = {};
  try {
    parsed = JSON.parse(reply.text);
  } catch {
    return { ok: false, data: [] };
  }

  const cards = (parsed.cards ?? [])
    .map((card) => sanitizeCard(card))
    .filter((card): card is GeneratedCard => Boolean(card));

  if (cards.length < 4) {
    return { ok: false, data: cards };
  }

  const byType = new Map(cards.map((card) => [card.cardType, card]));
  const ordered: GeneratedCard[] = [];
  for (const type of ["recall", "apply", "reflect", "decision"] as CardType[]) {
    const card = byType.get(type);
    if (card) ordered.push(card);
  }

  if (ordered.length !== 4) {
    return { ok: false, data: ordered };
  }

  return { ok: true, data: ordered, model: reply.model };
}

export async function generateReviewCardFromSummary(input: {
  summary: string;
  rawInput: string;
  cardType?: CardType;
  instruction?: string;
  settings?: UserSettings;
}): Promise<LlmResult<GeneratedCard | null>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: null };
  }

  const allowedCardTypes = input.cardType ? [input.cardType] : ["recall", "apply", "reflect", "discuss"];
  const typeInstruction =
    input.cardType === "custom"
      ? "Generate exactly one custom card. Use the custom instruction below as the primary brief for the task."
      : input.cardType
        ? `Generate exactly one ${input.cardType} card.`
        : "Generate exactly one card and choose the best cardType from recall, apply, reflect, or discuss.";

  const systemPrompt = appendOptionalInstruction([
    "You generate one learning review card.",
    buildLanguageInstruction(input.settings?.responseLanguage || "Finnish"),
    "Return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "card": {"cardType":"recall|apply|reflect|discuss|decision|custom","prompt":"...","answer":"..."}',
    "}",
    typeInstruction,
    `Allowed card types: ${allowedCardTypes.join(", ")}.`
  ], input.instruction).join("\n");

  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        "Generate a single review card using both the original capture and the refined summary.",
        "",
        "Original capture:",
        input.rawInput || "(none)",
        "",
        "Summary:",
        input.summary
      ].join("\n")
    }
  ]);

  let parsed: unknown = {};
  try {
    parsed = JSON.parse(reply.text);
  } catch {
    return { ok: false, data: null };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, data: null };
  }

  const parsedRecord = parsed as { card?: Partial<GeneratedCard> } & Partial<GeneratedCard>;
  const rawCard =
    parsedRecord.card && typeof parsedRecord.card === "object" ? parsedRecord.card : parsedRecord;
  const card = sanitizeCard(rawCard);
  if (!card) {
    return { ok: false, data: null };
  }

  if (input.cardType) {
    return {
      ok: true,
      data: {
        ...card,
        cardType: input.cardType
      },
      model: reply.model
    };
  }

  return { ok: true, data: card, model: reply.model };
}

export async function generateSourceTags(input: {
  title: string;
  idea: string;
  existingTags?: TagSuggestion[];
  settings?: UserSettings;
}): Promise<LlmResult<string[]>> {
  const relevantExistingTags = selectRelevantExistingTags({
    title: input.title,
    idea: input.idea,
    existingTags: input.existingTags,
    limit: 6
  });
  const fallbackTags = dedupeTags([
    ...relevantExistingTags,
    ...suggestSourceTags({
      title: input.title,
      idea: input.idea
    })
  ]).slice(0, 6);

  if (!isLlmConfigured()) {
    return { ok: false, data: fallbackTags };
  }

  const frequentTags = (input.existingTags ?? [])
    .filter((tag) => tag.isPopular)
    .slice(0, 10)
    .map((tag) => `${tag.tag} (${tag.usageCount})`);
  const recentTags = [...(input.existingTags ?? [])]
    .sort((left, right) => right.lastUsedAt.localeCompare(left.lastUsedAt))
    .slice(0, 10)
    .map((tag) => `${tag.tag} (${tag.usageCount})`);

  const systemPrompt = appendOptionalInstruction([
    "You generate concise source tags for a learning capture.",
    buildLanguageInstruction(input.settings?.responseLanguage || "Finnish"),
    "Return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "tags": ["tag 1", "tag 2"]',
    "}",
    "Prefer concrete, searchable topic labels.",
    "Prefer reusing the user's existing tags when they are relevant.",
    "When an existing tag fits semantically, return that exact existing spelling instead of inventing a new synonym.",
    "Avoid duplicate or near-duplicate synonyms.",
    "Use only information found in the title and idea."
  ], input.settings?.tagGenerationPrompt || DEFAULT_TAG_GENERATION_PROMPT).join("\n");
  const userPrompt = [
    `Title:\n${normalizeBlock(input.title) || "(empty)"}`,
    "",
    `Idea:\n${normalizeBlock(input.idea) || "(empty)"}`,
    "",
    `Relevant existing tags to prefer first:\n${relevantExistingTags.join(", ") || "(none)"}`,
    "",
    `Frequently used tags:\n${frequentTags.join(", ") || "(none)"}`,
    "",
    `Recent tags:\n${recentTags.join(", ") || "(none)"}`
  ].join("\n");
  const debugPrompt = [`[system]`, systemPrompt, "", `[user]`, userPrompt].join("\n");

  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: userPrompt
    }
  ]);

  let parsed: Partial<GeneratedTagsPayload> = {};
  try {
    parsed = JSON.parse(reply.text);
  } catch {
    return { ok: false, data: fallbackTags, model: reply.model, debugPrompt };
  }

  const sanitized = sanitizeGeneratedTags(parsed);
  if (!sanitized) {
    return { ok: false, data: fallbackTags, model: reply.model, debugPrompt };
  }

  return {
    ok: true,
    data: alignTagsToExisting(sanitized.tags, input.existingTags).slice(0, 6),
    model: reply.model,
    debugPrompt
  };
}

export async function refineSourceDraft(input: {
  mode: AnalysisMode | "custom";
  title: string;
  idea: string;
  analysis: string;
  rawInput: string;
  tags: string[];
  customInstruction?: string;
  settings?: UserSettings;
}): Promise<LlmResult<RefinedSourceDraft>> {
  if (input.mode === "custom" && !normalizeBlock(input.customInstruction || "")) {
    throw new Error("Kirjoita oma ohje syventamista varten.");
  }

  if (!isLlmConfigured()) {
    return {
      ok: true,
      data: fallbackRefinedSourceDraft(input)
    };
  }

  const instructionByMode = {
    clarify:
      "Clarify the analysis into a clean and easy-to-understand summary without losing the main message.",
    deepen:
      "Deepen the analysis with sharper reasoning, implications, examples, and next actions.",
    condense:
      "Condense the analysis into its clearest core message while keeping the meaning intact.",
    network:
      "Suggest the kinds of people or experts the user should talk with to deepen the topic further.",
    custom:
      "Rewrite the analysis according to the user's custom instruction while staying grounded in the original capture."
  } as const;

  const customInstruction = input.mode === "custom"
    ? normalizeBlock(input.customInstruction || "")
    : getAnalysisPrompt(input.settings, input.mode);

  const systemPrompt = appendOptionalInstruction([
    "You are a learning capture editor.",
    buildLanguageInstruction(input.settings?.responseLanguage || "Finnish"),
    "Keep the writing concise.",
    "Preserve readable paragraph breaks when the response is longer than a couple of sentences.",
    "Return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "analysis": "editable analysis text"',
    "}",
    "Do not rewrite the title, idea, or tags.",
    "Keep analysis directly editable by the user.",
    "Preserve the user's intent and wording where possible."
  ], customInstruction).join("\n");

  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        instructionByMode[input.mode],
        "",
        `Title:\n${normalizeBlock(input.title) || "(empty)"}`,
        "",
        `Idea:\n${normalizeBlock(input.idea) || "(empty)"}`,
        "",
        `Analysis:\n${normalizeBlock(input.analysis) || "(empty)"}`,
        "",
        `Original capture:\n${normalizeBlock(input.rawInput) || "(empty)"}`,
        "",
        `Existing tags:\n${input.tags.join(", ") || "(none)"}`
      ].join("\n")
    }
  ]);

  let parsed: Partial<RefinedAnalysisPayload> = {};
  try {
    parsed = JSON.parse(reply.text);
  } catch {
    return {
      ok: true,
      data: fallbackRefinedSourceDraft(input),
      model: reply.model
    };
  }

  const sanitized = sanitizeRefinedAnalysis(parsed);
  if (!sanitized) {
    return {
      ok: true,
      data: fallbackRefinedSourceDraft(input),
      model: reply.model
    };
  }

  return {
    ok: true,
    data: {
      title: normalizeBlock(input.title) || "Untitled idea",
      idea: normalizeBlock(input.idea) || normalizeBlock(input.rawInput) || normalizeBlock(input.title) || "Untitled idea",
      analysis: sanitized.analysis,
      tags: input.tags
    },
    model: reply.model
  };
}
