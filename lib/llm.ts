import { CardType } from "@/lib/types";

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
  };

  return {
    text: (json.output_text || "").trim(),
    model: json.model
  };
}

function sanitizeCard(input: Partial<GeneratedCard>): GeneratedCard | null {
  const allowedTypes: CardType[] = ["recall", "apply", "reflect", "decision"];
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

export async function generateCaptureSummaryReply(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<LlmResult<string>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: "" };
  }

  const systemPrompt = [
    "You are a learning capture assistant.",
    "Write in concise Finnish.",
    "Goal: produce a practical summary draft the user can edit.",
    "Always include this structure:",
    "Summary draft:",
    "<2-5 concise sentences>",
    "",
    "Key points:",
    "- bullet 1",
    "- bullet 2",
    "- bullet 3",
    "",
    "Focus on concrete decisions, actions, and why this matters now."
  ].join("\n");

  const recentMessages = input.messages.slice(-10);
  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  ]);

  return { ok: Boolean(reply.text), data: reply.text, model: reply.model };
}

export async function generateReviewCardsFromSummary(input: {
  summary: string;
}): Promise<LlmResult<GeneratedCard[]>> {
  if (!isLlmConfigured()) {
    return { ok: false, data: [] };
  }

  const systemPrompt = [
    "You generate learning review cards in Finnish.",
    "Return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "cards": [',
    '    {"cardType":"recall|apply|reflect|decision","prompt":"...","answer":"..."}',
    "  ]",
    "}",
    "Generate exactly 4 cards, one per type: recall, apply, reflect, decision.",
    "Make prompts concrete and actionable for a founder/leader context."
  ].join("\n");

  const reply = await callResponsesApi([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Summary:\n${input.summary}` }
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
