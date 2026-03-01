import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CaptureRole, CardType, InputModality, SourceType } from "@/lib/types";
import {
  generateCaptureSummaryReply,
  generateReviewCardsFromSummary,
  isLlmConfigured
} from "@/lib/llm";

function appUserId(): string {
  return process.env.APP_USER_ID ?? "11111111-1111-1111-1111-111111111111";
}

export interface SourceRow {
  id: string;
  user_id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  published_at: string | null;
  url: string | null;
  tags: string[] | null;
  capture_mode: string;
  created_at: string;
}

export interface SummaryRow {
  id: string;
  user_id: string;
  source_id: string;
  content: string;
  raw_input: string | null;
  input_modality: InputModality;
  source: "manual" | "chatgpt";
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  user_id: string;
  source_id: string;
  summary_id: string | null;
  status: "suggested" | "active" | "rejected";
  card_type: CardType;
  prompt: string;
  answer: string;
  due_at: string | null;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  last_reviewed_at: string | null;
  generation_model: string | null;
  generation_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DueReviewCard extends CardRow {
  source_title: string;
  summary_content: string | null;
}

export interface CardAnswerHistoryItem {
  created_at: string;
  user_answer: string;
}

export interface CaptureMessageRow {
  id: string;
  user_id: string;
  source_id: string;
  role: CaptureRole;
  content: string;
  created_at: string;
}

export interface ProgressPoint {
  date: string;
  reviewsCount: number;
  acceptedCount: number;
  appliedCount: number;
  lmsScore: number;
}

export interface ProgressSnapshot {
  activeReviewDays30: number;
  cardsAccepted30: number;
  appliedInsights30: number;
  todayDelta: number;
  lmsTrend90: ProgressPoint[];
}

const CARD_GENERATION_MODEL = "rule-v1";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function shiftDays(base: Date, delta: number): Date {
  const copy = new Date(base);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

function buildFallbackAssistantSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Kerro lahteesta muutamalla lauseella, niin teen sinulle summary-ehdotuksen.";
  }
  const preview = normalized.slice(0, 420);
  return [
    "Summary draft:",
    preview,
    "",
    "Key points:",
    "- Miksi tama on sinulle relevantti juuri nyt?",
    "- Mita paatosta tai toimintaa tama voisi muuttaa?"
  ].join("\n");
}

function logLlmError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("[llm-error]", context, {
    message,
    stack,
    ...metadata
  });
}

function logLlmWarning(context: string, metadata?: Record<string, unknown>) {
  console.warn("[llm-warning]", context, metadata ?? {});
}

export async function logLearningEvent(input: {
  eventType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("learning_events").insert({
    user_id: appUserId(),
    event_type: input.eventType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {}
  });
  if (error) throw error;
}

export async function listSources() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("user_id", appUserId())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SourceRow[];
}

export async function createSource(input: {
  type: SourceType;
  title: string;
  author?: string;
  origin?: string;
  publishedAt?: string;
  url?: string;
  tags?: string[];
  captureMode?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sources")
    .insert({
      user_id: appUserId(),
      type: input.type,
      title: input.title,
      author: input.author || null,
      origin: input.origin || null,
      published_at: input.publishedAt || null,
      url: input.url || null,
      tags: input.tags?.length ? input.tags : [],
      capture_mode: input.captureMode ?? "manual"
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SourceRow;
}

export async function createSourceFromCapture(input: {
  title: string;
  type: SourceType;
  rawInput: string;
  inputModality: InputModality;
}) {
  const source = await createSource({
    type: input.type,
    title: input.title,
    captureMode: "chat"
  });

  await appendCaptureMessage({
    sourceId: source.id,
    role: "user",
    content: input.rawInput
  });

  const llmReply = await generateCaptureSummaryReply({
    messages: [{ role: "user", content: input.rawInput }]
  }).catch((error) => {
    logLlmError("createSourceFromCapture.generateCaptureSummaryReply", error, {
      sourceId: source.id
    });
    return { ok: false, data: "" };
  });

  if (!llmReply.ok && isLlmConfigured()) {
    logLlmWarning("createSourceFromCapture.fallback_to_rule_summary", {
      sourceId: source.id
    });
  }

  const assistantSummary =
    llmReply.ok && llmReply.data
      ? llmReply.data
      : buildFallbackAssistantSummary(input.rawInput);

  await appendCaptureMessage({
    sourceId: source.id,
    role: "assistant",
    content: assistantSummary
  });

  await upsertSummary(source.id, assistantSummary, {
    rawInput: input.rawInput,
    inputModality: input.inputModality,
    source: "chatgpt"
  });

  await logLearningEvent({
    eventType: "capture_submitted",
    entityId: source.id,
    payload: {
      input_modality: input.inputModality
    }
  });

  return source;
}

export async function listCaptureMessages(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("capture_messages")
    .select("*")
    .eq("user_id", appUserId())
    .eq("source_id", sourceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CaptureMessageRow[];
}

export async function appendCaptureMessage(input: {
  sourceId: string;
  role: CaptureRole;
  content: string;
}) {
  const supabase = getSupabaseAdmin();
  const content = input.content.trim();
  if (!content) return;

  const { error } = await supabase.from("capture_messages").insert({
    user_id: appUserId(),
    source_id: input.sourceId,
    role: input.role,
    content
  });
  if (error) throw error;
}

export async function respondInCapture(sourceId: string, userMessage: string) {
  await appendCaptureMessage({ sourceId, role: "user", content: userMessage });

  const messageHistory = await listCaptureMessages(sourceId);
  const llmReply = await generateCaptureSummaryReply({
    messages: messageHistory.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content
    }))
  }).catch((error) => {
    logLlmError("respondInCapture.generateCaptureSummaryReply", error, {
      sourceId
    });
    return { ok: false, data: "" };
  });

  if (!llmReply.ok && isLlmConfigured()) {
    logLlmWarning("respondInCapture.fallback_to_rule_summary", {
      sourceId
    });
  }

  const reply =
    llmReply.ok && llmReply.data
      ? llmReply.data
      : buildFallbackAssistantSummary(userMessage);

  await appendCaptureMessage({ sourceId, role: "assistant", content: reply });
}

export async function getSourceWithDetails(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();

  const [
    { data: source, error: sourceError },
    { data: summary, error: summaryError },
    { data: cards, error: cardsError },
    { data: captureMessages, error: captureMessagesError }
  ] = await Promise.all([
    supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("summaries")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("cards")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("capture_messages")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
  ]);

  if (sourceError) throw sourceError;
  if (summaryError) throw summaryError;
  if (cardsError) throw cardsError;
  if (captureMessagesError) throw captureMessagesError;

  return {
    source: source as SourceRow | null,
    summary: summary as SummaryRow | null,
    cards: (cards ?? []) as CardRow[],
    captureMessages: (captureMessages ?? []) as CaptureMessageRow[]
  };
}

export async function upsertSummary(
  sourceId: string,
  content: string,
  opts?: {
    rawInput?: string | null;
    inputModality?: InputModality;
    source?: "manual" | "chatgpt";
  }
) {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();

  const { data, error } = await supabase
    .from("summaries")
    .upsert(
      {
        user_id: userId,
        source_id: sourceId,
        content,
        source: opts?.source ?? "manual",
        raw_input: opts?.rawInput ?? null,
        input_modality: opts?.inputModality ?? "text"
      },
      { onConflict: "source_id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  await logLearningEvent({
    eventType: "summary_saved",
    entityId: sourceId
  });

  return data as SummaryRow;
}

export async function generateSuggestedCards(params: {
  sourceId: string;
  summaryId: string | null;
  summaryContent: string;
}) {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();
  const trimmed = params.summaryContent.trim();
  if (!trimmed) return;

  await supabase
    .from("cards")
    .delete()
    .eq("source_id", params.sourceId)
    .eq("user_id", userId)
    .eq("status", "suggested");

  const fallbackCards = [
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "recall",
      prompt: "Mika on taman summaryn tarkein vaittama?",
      answer: trimmed.slice(0, 280),
      generation_model: CARD_GENERATION_MODEL,
      generation_context: { mode: "summary", variant: "recall" }
    },
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "apply",
      prompt: "Miten sovellat tata ideaa seuraavaan oikeaan tilanteeseen?",
      answer: "Valitse yksi paatos ja testaa tata periaatetta viikon aikana.",
      generation_model: CARD_GENERATION_MODEL,
      generation_context: { mode: "summary", variant: "apply" }
    },
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "reflect",
      prompt: "Mika tassa ideassa haastaa nykyisen ajattelutapasi?",
      answer: "Kirjaa yksi oletus, jonka paivitat taman lahteen perusteella.",
      generation_model: CARD_GENERATION_MODEL,
      generation_context: { mode: "summary", variant: "reflect" }
    },
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "decision",
      prompt: "Mika paatostradeoff kannattaa ratkaista tanaan taman pohjalta?",
      answer:
        "Kirjaa kaksi vaihtoehtoa, valitse toinen ja perustele valinta yhdella virkkeella.",
      generation_model: CARD_GENERATION_MODEL,
      generation_context: { mode: "summary", variant: "decision" }
    }
  ];

  const llmCards = await generateReviewCardsFromSummary({
    summary: trimmed
  }).catch((error) => {
    logLlmError("generateSuggestedCards.generateReviewCardsFromSummary", error, {
      sourceId: params.sourceId
    });
    return { ok: false, data: [], model: undefined };
  });

  if (!llmCards.ok && isLlmConfigured()) {
    logLlmWarning("generateSuggestedCards.fallback_to_rule_cards", {
      sourceId: params.sourceId,
      summaryId: params.summaryId
    });
  }

  const cardsToInsert = llmCards.ok
    ? llmCards.data.map((card) => ({
        user_id: userId,
        source_id: params.sourceId,
        summary_id: params.summaryId,
        status: "suggested" as const,
        card_type: card.cardType,
        prompt: card.prompt,
        answer: card.answer,
        generation_model: llmCards.model ?? "openai",
        generation_context: { mode: "summary", provider: "openai", variant: card.cardType }
      }))
    : fallbackCards;

  const { error } = await supabase.from("cards").insert(cardsToInsert);
  if (error) throw error;

  await logLearningEvent({
    eventType: "cards_generated",
    entityId: params.sourceId,
    payload: { count: cardsToInsert.length }
  });
}

export async function updateCard(params: {
  cardId: string;
  sourceId: string;
  prompt: string;
  answer: string;
  cardType: CardType;
  status?: "suggested" | "active" | "rejected";
}) {
  const supabase = getSupabaseAdmin();
  const dueAt = params.status === "active" ? new Date().toISOString() : undefined;

  const { error } = await supabase
    .from("cards")
    .update({
      prompt: params.prompt,
      answer: params.answer,
      card_type: params.cardType,
      ...(params.status ? { status: params.status } : {}),
      ...(dueAt ? { due_at: dueAt } : {})
    })
    .eq("id", params.cardId)
    .eq("source_id", params.sourceId)
    .eq("user_id", appUserId());

  if (error) throw error;

  if (params.status === "active") {
    await logLearningEvent({
      eventType: "card_accepted",
      entityId: params.cardId,
      payload: { source_id: params.sourceId, card_type: params.cardType }
    });
  }
  if (params.status === "rejected") {
    await logLearningEvent({
      eventType: "card_rejected",
      entityId: params.cardId,
      payload: { source_id: params.sourceId, card_type: params.cardType }
    });
  }
}

export async function acceptAllSuggested(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cards")
    .update({
      status: "active",
      due_at: new Date().toISOString()
    })
    .eq("source_id", sourceId)
    .eq("user_id", appUserId())
    .eq("status", "suggested")
    .select("id, card_type");

  if (error) throw error;

  for (const row of data ?? []) {
    await logLearningEvent({
      eventType: "card_accepted",
      entityId: row.id,
      payload: { source_id: sourceId, card_type: row.card_type }
    });
  }
}

export async function listDueCards() {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", appUserId())
    .eq("status", "active")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as CardRow[];
}

export async function listDueCardsWithContext(): Promise<DueReviewCard[]> {
  const dueCards = await listDueCards();
  if (!dueCards.length) return [];

  const supabase = getSupabaseAdmin();
  const userId = appUserId();
  const sourceIds = Array.from(new Set(dueCards.map((card) => card.source_id)));

  const [{ data: sources, error: sourcesError }, { data: summaries, error: summariesError }] =
    await Promise.all([
      supabase.from("sources").select("id, title").eq("user_id", userId).in("id", sourceIds),
      supabase
        .from("summaries")
        .select("source_id, content")
        .eq("user_id", userId)
        .in("source_id", sourceIds)
    ]);

  if (sourcesError) throw sourcesError;
  if (summariesError) throw summariesError;

  const sourceTitleById = new Map((sources ?? []).map((item) => [item.id, item.title]));
  const summaryBySourceId = new Map((summaries ?? []).map((item) => [item.source_id, item.content]));

  return dueCards.map((card) => ({
    ...card,
    source_title: sourceTitleById.get(card.source_id) ?? "Unknown source",
    summary_content: summaryBySourceId.get(card.source_id) ?? null
  }));
}

export async function listCardAnswerHistory(cardId: string): Promise<CardAnswerHistoryItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("learning_events")
    .select("created_at, payload")
    .eq("user_id", appUserId())
    .eq("event_type", "review_completed")
    .eq("entity_id", cardId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const userAnswer = typeof payload.user_answer === "string" ? payload.user_answer.trim() : "";
      if (!userAnswer) return null;
      return { created_at: row.created_at, user_answer: userAnswer };
    })
    .filter((item): item is CardAnswerHistoryItem => Boolean(item));
}

export async function countReviewsCompletedToday(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const dayStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  ).toISOString();

  const { count, error } = await supabase
    .from("learning_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", appUserId())
    .eq("event_type", "review_completed")
    .gte("created_at", dayStartUtc);

  if (error) throw error;
  return count ?? 0;
}

export async function completeReview(cardId: string, rating: number, userAnswer?: string) {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();
  const reviewedAt = new Date();
  const dueAt = shiftDays(reviewedAt, 1 + Math.max(0, rating));

  const { error: logError } = await supabase.from("review_logs").insert({
    user_id: userId,
    card_id: cardId,
    rating
  });
  if (logError) throw logError;

  const { error: cardError } = await supabase
    .from("cards")
    .update({
      last_reviewed_at: reviewedAt.toISOString(),
      due_at: dueAt.toISOString(),
      reps: 1
    })
    .eq("id", cardId)
    .eq("user_id", userId);
  if (cardError) throw cardError;

  await logLearningEvent({
    eventType: "review_completed",
    entityId: cardId,
    payload: { rating, user_answer: userAnswer?.trim() || null }
  });
}

export async function createAppliedInsight(input: {
  note: string;
  sourceId?: string | null;
  cardId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const trimmedNote = input.note.trim();
  if (!trimmedNote) return;

  const { data, error } = await supabase
    .from("applied_insights")
    .insert({
      user_id: appUserId(),
      source_id: input.sourceId ?? null,
      card_id: input.cardId ?? null,
      note: trimmedNote
    })
    .select("id")
    .single();
  if (error) throw error;

  await logLearningEvent({
    eventType: "insight_logged",
    entityId: data.id,
    payload: { source_id: input.sourceId ?? null, card_id: input.cardId ?? null }
  });
}

export async function listAppliedInsights(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("applied_insights")
    .select("*")
    .eq("user_id", appUserId())
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

function normalize(value: number, cap: number): number {
  return Math.min(1, value / cap);
}

export async function getProgressSnapshot(): Promise<ProgressSnapshot> {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();
  const now = new Date();
  const from90 = shiftDays(now, -89).toISOString();
  const from30 = shiftDays(now, -29).toISOString();

  const { data: events, error: eventsError } = await supabase
    .from("learning_events")
    .select("event_type, created_at")
    .eq("user_id", userId)
    .gte("created_at", from90)
    .order("created_at", { ascending: true });

  if (eventsError) throw eventsError;

  const daily = new Map<string, ProgressPoint>();
  for (let i = 89; i >= 0; i -= 1) {
    const date = toIsoDate(shiftDays(now, -i));
    daily.set(date, {
      date,
      reviewsCount: 0,
      acceptedCount: 0,
      appliedCount: 0,
      lmsScore: 0
    });
  }

  for (const event of events ?? []) {
    const key = event.created_at.slice(0, 10);
    const point = daily.get(key);
    if (!point) continue;
    if (event.event_type === "review_completed") point.reviewsCount += 1;
    if (event.event_type === "card_accepted") point.acceptedCount += 1;
    if (event.event_type === "insight_logged") point.appliedCount += 1;
  }

  for (const point of daily.values()) {
    const score =
      0.5 * normalize(point.reviewsCount, 10) +
      0.3 * normalize(point.acceptedCount, 5) +
      0.2 * normalize(point.appliedCount, 3);
    point.lmsScore = Number(score.toFixed(4));
  }

  const trend = Array.from(daily.values());
  const trend30 = trend.filter((point) => point.date >= from30.slice(0, 10));
  const activeDays = trend30.filter((point) => point.reviewsCount > 0).length;
  const accepted30 = trend30.reduce((sum, point) => sum + point.acceptedCount, 0);
  const applied30 = trend30.reduce((sum, point) => sum + point.appliedCount, 0);
  const todayKey = toIsoDate(now);
  const todayDelta = trend.find((point) => point.date === todayKey)?.lmsScore ?? 0;

  return {
    activeReviewDays30: activeDays,
    cardsAccepted30: accepted30,
    appliedInsights30: applied30,
    todayDelta,
    lmsTrend90: trend
  };
}
