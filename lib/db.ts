import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  CaptureAssetKind,
  CaptureRole,
  CardType,
  IdeaStatus,
  InputModality,
  SourceType
} from "@/lib/types";
import {
  extractTextFromCaptureImage,
  generateCaptureSummaryReply,
  generateReviewCardFromSummary,
  isLlmConfigured,
  transcribeCaptureAudio
} from "@/lib/llm";
import { dedupeTags, normalizeCaptureSummary, normalizeTagValue } from "@/lib/source-editor";
import {
  DEFAULT_TASK_GENERATION_PROMPTS,
  DEFAULT_USER_SETTINGS,
  sanitizeUserSettings,
  UserSettings
} from "@/lib/user-settings";
import { requireUserId } from "@/lib/auth";
import type { TagSuggestion } from "@/lib/types";

async function appUserId(): Promise<string> {
  return requireUserId();
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
  idea_status: IdeaStatus;
  created_at: string;
  summary_content?: string | null;
  raw_input?: string | null;
  has_cards?: boolean;
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

export interface UnrefinedIdeaQueueItem {
  id: string;
  title: string;
  tags: string[] | null;
  type: SourceType;
  capture_mode: string;
  created_at: string;
  summary_content: string | null;
  raw_input: string | null;
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

export interface CaptureAssetRow {
  id: string;
  user_id: string;
  source_id: string;
  kind: CaptureAssetKind;
  file_name: string;
  mime_type: string;
  file_size: number;
  base64_data: string;
  created_at: string;
}

export interface ProgressPoint {
  date: string;
  reviewsCount: number;
  acceptedCount: number;
  lmsScore: number;
}

export interface ProgressSnapshot {
  activeReviewDays30: number;
  cardsAccepted30: number;
  todayDelta: number;
  lmsTrend90: ProgressPoint[];
}

export interface UserSettingsRow extends UserSettings {
  user_id: string;
  created_at: string;
  updated_at: string;
}

type TagAggregate = {
  tag: string;
  usageCount: number;
  lastUsedAt: string;
};

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  device_label: string | null;
  subscription_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_sent_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
}

export interface UserNotificationSettings {
  morningReminderEnabled: boolean;
  morningReminderTime: string;
  morningReminderTimezone: string;
}

export interface UserNotificationSettingsRow extends UserNotificationSettings {
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionDebugRow {
  id: string;
  endpoint: string;
  deviceLabel: string | null;
  createdAt: string;
  updatedAt: string;
  lastSentAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface UserPushDebugSnapshot {
  userId: string;
  reminder: {
    enabled: boolean;
    targetTime: string;
    timezone: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
  subscriptionCount: number;
  subscriptions: PushSubscriptionDebugRow[];
}

export const DEFAULT_USER_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  morningReminderEnabled: false,
  morningReminderTime: "08:00",
  morningReminderTimezone: "UTC"
};

const CARD_GENERATION_MODEL = "rule-v1";
const UNREFINED_IDEA_QUEUE_LIMIT = 20;

function isMissingIdeaStatusColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return message.includes("idea_status");
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function shiftDays(base: Date, delta: number): Date {
  const copy = new Date(base);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

function shiftMinutes(base: Date, delta: number): Date {
  const copy = new Date(base);
  copy.setUTCMinutes(copy.getUTCMinutes() + delta);
  return copy;
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sanitizeTime(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderTime;
}

function sanitizeTimezone(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderTimezone;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderTimezone;
  }
}

export function sanitizeUserNotificationSettings(
  input: Partial<UserNotificationSettings> | null | undefined
): UserNotificationSettings {
  return {
    morningReminderEnabled:
      typeof input?.morningReminderEnabled === "boolean"
        ? input.morningReminderEnabled
        : DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderEnabled,
    morningReminderTime: sanitizeTime(input?.morningReminderTime),
    morningReminderTimezone: sanitizeTimezone(input?.morningReminderTimezone)
  };
}

function mapUserNotificationSettingsRow(row: {
  user_id: string;
  morning_reminder_enabled: boolean;
  morning_reminder_time: string;
  morning_reminder_timezone: string;
  created_at: string;
  updated_at: string;
}): UserNotificationSettingsRow {
  return {
    user_id: row.user_id,
    morningReminderEnabled: Boolean(row.morning_reminder_enabled),
    morningReminderTime: row.morning_reminder_time,
    morningReminderTimezone: row.morning_reminder_timezone,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toPushSubscriptionDebugRow(row: PushSubscriptionRow): PushSubscriptionDebugRow {
  return {
    id: row.id,
    endpoint: row.endpoint,
    deviceLabel: row.device_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSentAt: row.last_sent_at,
    lastErrorAt: row.last_error_at,
    lastErrorMessage: row.last_error_message
  };
}

function toUserPushDebugSnapshot(
  userId: string,
  settings: UserNotificationSettingsRow | null,
  subscriptions: PushSubscriptionRow[]
): UserPushDebugSnapshot {
  const reminder = settings
    ? {
        enabled: settings.morningReminderEnabled,
        targetTime: settings.morningReminderTime,
        timezone: settings.morningReminderTimezone,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      }
    : {
        enabled: DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderEnabled,
        targetTime: DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderTime,
        timezone: DEFAULT_USER_NOTIFICATION_SETTINGS.morningReminderTimezone,
        createdAt: null,
        updatedAt: null
      };

  return {
    userId,
    reminder,
    subscriptionCount: subscriptions.length,
    subscriptions: subscriptions.map(toPushSubscriptionDebugRow)
  };
}

function buildFallbackAssistantSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Kerro lahteesta muutamalla lauseella, niin teen sinulle summary-ehdotuksen.";
  }
  const preview = normalized.slice(0, 420);
  return [
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

function joinInstructions(...values: Array<string | null | undefined>) {
  return values
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

function getTaskTypeInstruction(settings: UserSettings, cardType: CardType) {
  if (cardType === "recall") {
    return settings.recallCardGenerationPrompt || DEFAULT_TASK_GENERATION_PROMPTS.recall;
  }
  if (cardType === "apply") {
    return settings.applyCardGenerationPrompt || DEFAULT_TASK_GENERATION_PROMPTS.apply;
  }
  if (cardType === "reflect") {
    return settings.reflectCardGenerationPrompt || DEFAULT_TASK_GENERATION_PROMPTS.reflect;
  }
  if (cardType === "discuss") {
    return settings.discussCardGenerationPrompt || DEFAULT_TASK_GENERATION_PROMPTS.discuss;
  }
  return "";
}

function buildFallbackGeneratedCard(input: {
  summary: string;
  cardType: CardType;
  instruction?: string;
}) {
  const preview = input.summary.trim().slice(0, 280);

  if (input.cardType === "recall") {
    return {
      cardType: "recall" as const,
      prompt: "Mika ajatuksen ydin kannattaa muistaa myohemmin?",
      answer: preview
    };
  }

  if (input.cardType === "reflect") {
    return {
      cardType: "reflect" as const,
      prompt: "Mita tama ajatus haastaa sinussa tai tavassasi ajatella?",
      answer: "Kirjaa yksi oletus, tulkinta tai tapa, jota haluat paivittaa taman ajatuksen pohjalta."
    };
  }

  if (input.cardType === "discuss") {
    return {
      cardType: "discuss" as const,
      prompt: "Kenen kanssa voisit keskustella tasta aiheesta syventaaksesi ymmarrystasi?",
      answer:
        "Nimea yksi ystava tai asiantuntija, sovi keskustelu ja kirjaa etukateen yksi kysymys, jonka haluat esittaa."
    };
  }

  if (input.cardType === "custom") {
    const instruction = (input.instruction || "").trim();
    return {
      cardType: "custom" as const,
      prompt: instruction || "Luo oma tehtava taman ajatuksen pohjalta.",
      answer: preview
    };
  }

  return {
    cardType: "apply" as const,
    prompt: "Missa seuraavassa oikeassa tilanteessa sovellat tata ajatusta?",
    answer: "Valitse yksi tilanne, tee pieni kokeilu ja kirjaa mita opit."
  };
}

export async function logLearningEvent(input: {
  eventType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const { error } = await supabase.from("learning_events").insert({
    user_id: userId,
    event_type: input.eventType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {}
  });
  if (error) throw error;
}

export async function getUserSettings(userId?: string): Promise<UserSettings> {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_USER_SETTINGS;

  return sanitizeUserSettings({
    responseLanguage: data.response_language,
    showDebug: data.show_debug,
    analysisPromptRefresh: data.analysis_prompt_refresh,
    analysisPromptDeepen: data.analysis_prompt_deepen,
    analysisPromptSummarize: data.analysis_prompt_summarize,
    analysisPromptNetwork: data.analysis_prompt_network,
    cardGenerationPrompt: data.card_generation_prompt,
    recallCardGenerationPrompt: data.recall_card_generation_prompt,
    applyCardGenerationPrompt: data.apply_card_generation_prompt,
    reflectCardGenerationPrompt: data.reflect_card_generation_prompt,
    discussCardGenerationPrompt: data.discuss_card_generation_prompt,
    tagGenerationPrompt: data.tag_generation_prompt
  });
}

export async function upsertUserSettings(input: UserSettings, userId?: string) {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const settings = sanitizeUserSettings(input);

  const { data, error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: resolvedUserId,
      response_language: settings.responseLanguage,
      show_debug: settings.showDebug,
      analysis_prompt_refresh: settings.analysisPromptRefresh,
      analysis_prompt_deepen: settings.analysisPromptDeepen,
      analysis_prompt_summarize: settings.analysisPromptSummarize,
      analysis_prompt_network: settings.analysisPromptNetwork,
      card_generation_prompt: settings.cardGenerationPrompt,
      recall_card_generation_prompt: settings.recallCardGenerationPrompt,
      apply_card_generation_prompt: settings.applyCardGenerationPrompt,
      reflect_card_generation_prompt: settings.reflectCardGenerationPrompt,
      discuss_card_generation_prompt: settings.discussCardGenerationPrompt,
      tag_generation_prompt: settings.tagGenerationPrompt
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    user_id: data.user_id,
    responseLanguage: data.response_language,
    showDebug: Boolean(data.show_debug),
    analysisPromptRefresh: data.analysis_prompt_refresh ?? "",
    analysisPromptDeepen: data.analysis_prompt_deepen ?? "",
    analysisPromptSummarize: data.analysis_prompt_summarize ?? "",
    analysisPromptNetwork: data.analysis_prompt_network ?? "",
    cardGenerationPrompt: data.card_generation_prompt ?? "",
    recallCardGenerationPrompt: data.recall_card_generation_prompt ?? "",
    applyCardGenerationPrompt: data.apply_card_generation_prompt ?? "",
    reflectCardGenerationPrompt: data.reflect_card_generation_prompt ?? "",
    discussCardGenerationPrompt: data.discuss_card_generation_prompt ?? "",
    tagGenerationPrompt: data.tag_generation_prompt ?? "",
    created_at: data.created_at,
    updated_at: data.updated_at
  } as UserSettingsRow;
}

export async function listPushSubscriptions(userId?: string) {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

export async function getUserNotificationSettings(userId?: string): Promise<UserNotificationSettings> {
  const row = await getUserNotificationSettingsRow(userId);
  if (!row) return DEFAULT_USER_NOTIFICATION_SETTINGS;

  return sanitizeUserNotificationSettings({
    morningReminderEnabled: row.morningReminderEnabled,
    morningReminderTime: row.morningReminderTime,
    morningReminderTimezone: row.morningReminderTimezone
  });
}

export async function getUserNotificationSettingsRow(userId?: string): Promise<UserNotificationSettingsRow | null> {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const { data, error } = await supabase
    .from("user_notification_settings")
    .select("*")
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapUserNotificationSettingsRow(data);
}

export async function upsertUserNotificationSettings(
  input: UserNotificationSettings,
  userId?: string
) {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const settings = sanitizeUserNotificationSettings(input);

  const { data, error } = await supabase
    .from("user_notification_settings")
    .upsert({
      user_id: resolvedUserId,
      morning_reminder_enabled: settings.morningReminderEnabled,
      morning_reminder_time: settings.morningReminderTime,
      morning_reminder_timezone: settings.morningReminderTimezone
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    user_id: data.user_id,
    morningReminderEnabled: Boolean(data.morning_reminder_enabled),
    morningReminderTime: data.morning_reminder_time,
    morningReminderTimezone: data.morning_reminder_timezone,
    created_at: data.created_at,
    updated_at: data.updated_at
  } as UserNotificationSettingsRow;
}

export async function listUsersWithMorningReminderEnabled() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_notification_settings")
    .select("*")
    .eq("morning_reminder_enabled", true);

  if (error) throw error;

  return (data ?? []).map((row) => mapUserNotificationSettingsRow(row));
}

export async function getUserPushDebugSnapshot(userId?: string): Promise<UserPushDebugSnapshot> {
  const resolvedUserId = userId ?? (await appUserId());
  const [settings, subscriptions] = await Promise.all([
    getUserNotificationSettingsRow(resolvedUserId),
    listPushSubscriptions(resolvedUserId)
  ]);

  return toUserPushDebugSnapshot(resolvedUserId, settings, subscriptions);
}

export async function upsertPushSubscription(input: {
  endpoint: string;
  subscription: Record<string, unknown>;
  deviceLabel?: string | null;
  userId?: string;
}) {
  const supabase = getSupabaseAdmin();
  const userId = input.userId ?? (await appUserId());
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
        {
          user_id: userId,
          endpoint: input.endpoint,
          device_label: input.deviceLabel?.trim() || null,
          subscription_json: input.subscription
        },
      { onConflict: "endpoint" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as PushSubscriptionRow;
}

export async function deletePushSubscription(endpoint: string, userId?: string) {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", resolvedUserId)
    .eq("endpoint", endpoint);

  if (error) throw error;
}

export async function markPushSubscriptionSent(
  endpoint: string,
  userId?: string,
  opts?: {
    recordSentAt?: boolean;
  }
) {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const update: Record<string, unknown> = {
    last_error_at: null,
    last_error_message: null
  };

  if (opts?.recordSentAt !== false) {
    update.last_sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .update(update)
    .eq("user_id", resolvedUserId)
    .eq("endpoint", endpoint);

  if (error) throw error;
}

export async function markPushSubscriptionError(
  endpoint: string,
  message: string,
  userId?: string
) {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const { error } = await supabase
    .from("push_subscriptions")
    .update({
      last_error_at: new Date().toISOString(),
      last_error_message: message
    })
    .eq("user_id", resolvedUserId)
    .eq("endpoint", endpoint);

  if (error) throw error;
}

export async function listSources() {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const [
    { data: sources, error: sourcesError },
    { data: cards, error: cardsError },
    { data: summaries, error: summariesError }
  ] =
    await Promise.all([
      supabase
        .from("sources")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("cards").select("source_id").eq("user_id", userId),
      supabase
        .from("summaries")
        .select("source_id, content, raw_input")
        .eq("user_id", userId)
    ]);

  if (sourcesError) throw sourcesError;
  if (cardsError) throw cardsError;
  if (summariesError) throw summariesError;

  const sourceIdsWithCards = new Set((cards ?? []).map((card) => card.source_id));
  const summaryBySourceId = new Map(
    (summaries ?? []).map((summary) => [
      summary.source_id,
      {
        content: typeof summary.content === "string" ? summary.content : null,
        raw_input: typeof summary.raw_input === "string" ? summary.raw_input : null
      }
    ])
  );

  return ((sources ?? []) as SourceRow[]).map((source) => ({
    ...source,
    summary_content: summaryBySourceId.get(source.id)?.content ?? null,
    raw_input: summaryBySourceId.get(source.id)?.raw_input ?? null,
    has_cards: sourceIdsWithCards.has(source.id)
  }));
}

export async function listUserTagStats(limit = 40): Promise<TagSuggestion[]> {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const { data, error } = await supabase
    .from("sources")
    .select("tags, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const aggregates = new Map<string, TagAggregate>();
  for (const row of data ?? []) {
    const createdAt = typeof row.created_at === "string" ? row.created_at : "";
    const rowTags = Array.isArray(row.tags) ? dedupeTags(row.tags) : [];

    for (const rawTag of rowTags) {
      const normalized = normalizeTagValue(rawTag);
      if (!normalized) continue;

      const current = aggregates.get(normalized);
      if (!current) {
        aggregates.set(normalized, {
          tag: rawTag,
          usageCount: 1,
          lastUsedAt: createdAt
        });
        continue;
      }

      current.usageCount += 1;
      if (createdAt > current.lastUsedAt) {
        current.lastUsedAt = createdAt;
        current.tag = rawTag;
      }
    }
  }

  const sorted = [...aggregates.values()]
    .sort(
      (left, right) =>
        right.usageCount - left.usageCount ||
        right.lastUsedAt.localeCompare(left.lastUsedAt) ||
        left.tag.localeCompare(right.tag, "fi-FI")
    )
    .slice(0, limit);

  const popularThreshold = sorted.length > 0 ? sorted[Math.min(5, sorted.length - 1)].usageCount : 0;

  return sorted.map((item, index) => ({
    tag: item.tag,
    usageCount: item.usageCount,
    lastUsedAt: item.lastUsedAt,
    isPopular: item.usageCount > 1 && index < 6 && item.usageCount >= popularThreshold
  }));
}

export async function listUnrefinedIdeas(
  limit = UNREFINED_IDEA_QUEUE_LIMIT
): Promise<UnrefinedIdeaQueueItem[]> {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const sources = await listSources();
  const queue = sources.filter((source) => !source.has_cards).slice(0, limit);

  if (!queue.length) return [];

  const sourceIds = queue.map((source) => source.id);
  const { data: summaries, error } = await supabase
    .from("summaries")
    .select("source_id, content, raw_input")
    .eq("user_id", userId)
    .in("source_id", sourceIds);

  if (error) throw error;

  const summaryBySourceId = new Map(
    (summaries ?? []).map((summary) => [
      summary.source_id,
      {
        content: typeof summary.content === "string" ? summary.content : null,
        raw_input: typeof summary.raw_input === "string" ? summary.raw_input : null
      }
    ])
  );

  return queue.map((source) => {
    const summary = summaryBySourceId.get(source.id);
    return {
      id: source.id,
      title: source.title,
      tags: source.tags ?? [],
      type: source.type,
      capture_mode: source.capture_mode,
      created_at: source.created_at,
      summary_content: summary?.content ?? null,
      raw_input: summary?.raw_input ?? null
    };
  });
}

export async function countReviewQueueItems(): Promise<number> {
  const [dueCardsCount, unrefinedIdeas] = await Promise.all([
    countDueCards(),
    listUnrefinedIdeas()
  ]);

  return dueCardsCount + unrefinedIdeas.length;
}

export async function countUnrefinedIdeas(userId?: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());

  const [{ data: sources, error: sourcesError }, { data: cards, error: cardsError }] =
    await Promise.all([
      supabase.from("sources").select("id").eq("user_id", resolvedUserId),
      supabase.from("cards").select("source_id").eq("user_id", resolvedUserId)
    ]);

  if (sourcesError) throw sourcesError;
  if (cardsError) throw cardsError;

  const sourceIdsWithCards = new Set((cards ?? []).map((card) => card.source_id));
  return (sources ?? []).filter((source) => !sourceIdsWithCards.has(source.id)).length;
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
  const userId = await appUserId();
  const baseInsert = {
    user_id: userId,
    type: input.type,
    title: input.title,
    author: input.author || null,
    origin: input.origin || null,
    published_at: input.publishedAt || null,
    url: input.url || null,
    tags: input.tags?.length ? dedupeTags(input.tags) : [],
    capture_mode: input.captureMode ?? "manual"
  };

  let result = await supabase
    .from("sources")
    .insert({
      ...baseInsert,
      idea_status: "draft"
    })
    .select("*")
    .single();

  if (result.error && isMissingIdeaStatusColumnError(result.error)) {
    result = await supabase.from("sources").insert(baseInsert).select("*").single();
  }

  if (result.error) throw result.error;
  return result.data as SourceRow;
}

export async function updateSource(input: {
  sourceId: string;
  title: string;
  tags?: string[];
  ideaStatus?: IdeaStatus;
}) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();

  const baseUpdate = {
    title: input.title,
    tags: input.tags?.length ? dedupeTags(input.tags) : []
  };

  let result = await supabase
    .from("sources")
    .update({
      ...baseUpdate,
      ...(input.ideaStatus ? { idea_status: input.ideaStatus } : {})
    })
    .eq("id", input.sourceId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (result.error && input.ideaStatus && isMissingIdeaStatusColumnError(result.error)) {
    result = await supabase
      .from("sources")
      .update(baseUpdate)
      .eq("id", input.sourceId)
      .eq("user_id", userId)
      .select("*")
      .single();
  }

  if (result.error) throw result.error;
  return result.data as SourceRow;
}

export async function sourceHasCards(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const { count, error } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .eq("user_id", userId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function deleteSource(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id")
    .eq("source_id", sourceId)
    .eq("user_id", userId);
  if (cardsError) throw cardsError;

  const cardIds = (cards ?? []).map((card) => card.id);

  const { error: sourceEventsError } = await supabase
    .from("learning_events")
    .delete()
    .eq("user_id", userId)
    .eq("entity_id", sourceId);
  if (sourceEventsError) throw sourceEventsError;

  if (cardIds.length > 0) {
    const { error: cardEventsError } = await supabase
      .from("learning_events")
      .delete()
      .eq("user_id", userId)
      .in("entity_id", cardIds);
    if (cardEventsError) throw cardEventsError;
  }

  const { error: sourceError } = await supabase
    .from("sources")
    .delete()
    .eq("id", sourceId)
    .eq("user_id", userId);
  if (sourceError) throw sourceError;
}

export async function createSourceFromCapture(input: {
  title: string;
  type: SourceType;
  rawInput: string;
  inputModality: InputModality;
  origin?: string;
  url?: string;
}) {
  const source = await createSource({
    type: input.type,
    title: input.title,
    origin: input.origin,
    url: input.url,
    captureMode: "chat"
  });

  await appendCaptureMessage({
    sourceId: source.id,
    role: "user",
    content: input.rawInput
  });

  await upsertSummary(source.id, input.rawInput, {
    rawInput: input.rawInput,
    inputModality: input.inputModality,
    source: "manual"
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

export async function createSourceFromMultimodalCapture(input: {
  title: string;
  type: SourceType;
  inputModality: InputModality;
  textInput?: string;
  sourceUrl?: string;
  origin?: string;
  imageFile?: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  };
  audioFile?: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  };
}) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const trimmedText = input.textInput?.trim() ?? "";
  const trimmedUrl = input.sourceUrl?.trim() ?? "";

  const source = await createSource({
    type: input.type,
    title: input.title,
    origin: input.origin,
    url: trimmedUrl || undefined,
    captureMode: "chat"
  });

  const attachmentRows: Array<{
    user_id: string;
    source_id: string;
    kind: CaptureAssetKind;
    file_name: string;
    mime_type: string;
    file_size: number;
    base64_data: string;
  }> = [];

  let extractedFromImage = "";
  if (input.imageFile) {
    const base64Data = Buffer.from(input.imageFile.bytes).toString("base64");
    attachmentRows.push({
      user_id: userId,
      source_id: source.id,
      kind: "image",
      file_name: input.imageFile.fileName,
      mime_type: input.imageFile.mimeType,
      file_size: input.imageFile.bytes.byteLength,
      base64_data: base64Data
    });

    const extracted = await extractTextFromCaptureImage({
      mimeType: input.imageFile.mimeType,
      base64Data,
      userContext: trimmedText
    }).catch((error) => {
      logLlmError("createSourceFromMultimodalCapture.extractTextFromCaptureImage", error, {
        sourceId: source.id
      });
      return { ok: false, data: "" };
    });

    extractedFromImage = extracted.data.trim();
  }

  let transcribedAudio = "";
  if (input.audioFile) {
    const base64Data = Buffer.from(input.audioFile.bytes).toString("base64");
    attachmentRows.push({
      user_id: userId,
      source_id: source.id,
      kind: "audio",
      file_name: input.audioFile.fileName,
      mime_type: input.audioFile.mimeType,
      file_size: input.audioFile.bytes.byteLength,
      base64_data: base64Data
    });

    const transcribed = await transcribeCaptureAudio({
      fileName: input.audioFile.fileName,
      mimeType: input.audioFile.mimeType,
      bytes: input.audioFile.bytes
    }).catch((error) => {
      logLlmError("createSourceFromMultimodalCapture.transcribeCaptureAudio", error, {
        sourceId: source.id
      });
      return { ok: false, data: "" };
    });

    transcribedAudio = transcribed.data.trim();
  }

  if (attachmentRows.length > 0) {
    const { error: attachmentError } = await supabase.from("capture_assets").insert(attachmentRows);
    if (attachmentError) throw attachmentError;
  }

  const rawInputParts = [
    trimmedUrl ? `Source URL:\n${trimmedUrl}` : "",
    trimmedText ? `User note:\n${trimmedText}` : "",
    extractedFromImage ? `Image text:\n${extractedFromImage}` : "",
    transcribedAudio ? `Voice transcript:\n${transcribedAudio}` : ""
  ].filter(Boolean);

  const rawInput = rawInputParts.join("\n\n").trim() || "Empty capture";

  await appendCaptureMessage({
    sourceId: source.id,
    role: "user",
    content: rawInput
  });

  await upsertSummary(source.id, rawInput, {
    rawInput,
    inputModality: input.inputModality,
    source: "manual"
  });

  await logLearningEvent({
    eventType: "capture_submitted",
    entityId: source.id,
    payload: {
      input_modality: input.inputModality,
      has_image: Boolean(input.imageFile),
      has_audio: Boolean(input.audioFile),
      has_url: Boolean(trimmedUrl)
    }
  });

  return source;
}

export async function createSourceFromPreparedCapture(input: {
  title: string;
  type: SourceType;
  rawInput: string;
  inputModality: InputModality;
  origin?: string;
  url?: string;
  asset?: {
    kind: CaptureAssetKind;
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  };
}) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const rawInput = input.rawInput.trim();

  const source = await createSource({
    type: input.type,
    title: input.title,
    origin: input.origin,
    url: input.url,
    captureMode: "chat"
  });

  if (input.asset) {
    const { error: assetError } = await supabase.from("capture_assets").insert({
      user_id: userId,
      source_id: source.id,
      kind: input.asset.kind,
      file_name: input.asset.fileName,
      mime_type: input.asset.mimeType,
      file_size: input.asset.bytes.byteLength,
      base64_data: Buffer.from(input.asset.bytes).toString("base64")
    });
    if (assetError) throw assetError;
  }

  await appendCaptureMessage({
    sourceId: source.id,
    role: "user",
    content: rawInput
  });

  await upsertSummary(source.id, rawInput, {
    rawInput,
    inputModality: input.inputModality,
    source: "manual"
  });

  await logLearningEvent({
    eventType: "capture_submitted",
    entityId: source.id,
    payload: {
      input_modality: input.inputModality,
      has_asset: Boolean(input.asset)
    }
  });

  return source;
}

export async function listCaptureMessages(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const { data, error } = await supabase
    .from("capture_messages")
    .select("*")
    .eq("user_id", userId)
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
  const userId = await appUserId();
  const content = input.content.trim();
  if (!content) return;

  const { error } = await supabase.from("capture_messages").insert({
    user_id: userId,
    source_id: input.sourceId,
    role: input.role,
    content
  });
  if (error) throw error;
}

export async function respondInCapture(sourceId: string, userMessage: string) {
  await appendCaptureMessage({ sourceId, role: "user", content: userMessage });

  const messageHistory = await listCaptureMessages(sourceId);
  const settings = await getUserSettings();
  const llmReply = await generateCaptureSummaryReply({
    settings,
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
  const userId = await appUserId();

  const [
    { data: source, error: sourceError },
    { data: summary, error: summaryError },
    { data: cards, error: cardsError },
    { data: captureMessages, error: captureMessagesError },
    { data: captureAssets, error: captureAssetsError }
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
      .order("created_at", { ascending: true }),
    supabase
      .from("capture_assets")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
  ]);

  if (sourceError) throw sourceError;
  if (summaryError) throw summaryError;
  if (cardsError) throw cardsError;
  if (captureMessagesError) throw captureMessagesError;
  if (captureAssetsError) throw captureAssetsError;

  return {
    source: source as SourceRow | null,
    summary: summary as SummaryRow | null,
    cards: (cards ?? []) as CardRow[],
    captureMessages: (captureMessages ?? []) as CaptureMessageRow[],
    captureAssets: (captureAssets ?? []) as CaptureAssetRow[]
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
  const userId = await appUserId();
  const normalizedContent = normalizeCaptureSummary(content);

  const { data, error } = await supabase
    .from("summaries")
    .upsert(
      {
        user_id: userId,
        source_id: sourceId,
        content: normalizedContent,
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

export async function generateSuggestedCard(params: {
  sourceId: string;
  cardType?: CardType;
  instruction?: string;
}) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const settings = await getUserSettings(userId);
  const { data: summary, error: summaryError } = await supabase
    .from("summaries")
    .select("id, content, raw_input")
    .eq("source_id", params.sourceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (summaryError) throw summaryError;
  if (!summary?.content?.trim()) return;

  const trimmed = summary.content.trim();
  const requestedCardType = params.cardType ?? "custom";
  const instruction = joinInstructions(
    settings.cardGenerationPrompt,
    params.cardType ? getTaskTypeInstruction(settings, params.cardType) : "",
    requestedCardType === "custom"
      ? "Create one custom task. The user's instruction is the main brief for what kind of task to generate."
      : "",
    params.instruction
  );
  let rawInput = (summary.raw_input || "").trim();
  if (!rawInput) {
    const { data: captureMessages, error: captureError } = await supabase
      .from("capture_messages")
      .select("content, role")
      .eq("source_id", params.sourceId)
      .eq("user_id", userId)
      .eq("role", "user")
      .order("created_at", { ascending: true });
    if (captureError) throw captureError;
    rawInput = (captureMessages ?? [])
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  const llmCard = await generateReviewCardFromSummary({
    settings,
    summary: trimmed,
    rawInput,
    cardType: requestedCardType,
    instruction
  }).catch((error) => {
    logLlmError("generateSuggestedCard.generateReviewCardFromSummary", error, {
      sourceId: params.sourceId,
      cardType: requestedCardType
    });
    return { ok: false, data: null, model: undefined };
  });

  if (!llmCard.ok && isLlmConfigured()) {
    logLlmWarning("generateSuggestedCard.fallback_to_rule_card", {
      sourceId: params.sourceId,
      summaryId: summary.id,
      cardType: requestedCardType
    });
  }

  const nextCard = llmCard.ok && llmCard.data
    ? llmCard.data
    : buildFallbackGeneratedCard({
        summary: trimmed,
        cardType: requestedCardType,
        instruction: params.instruction
      });

  const { data: insertedCard, error } = await supabase
    .from("cards")
    .insert({
      user_id: userId,
      source_id: params.sourceId,
      summary_id: summary.id,
      status: "active",
      due_at: new Date().toISOString(),
      card_type: nextCard.cardType,
      prompt: nextCard.prompt,
      answer: nextCard.answer,
      generation_model: llmCard.model ?? CARD_GENERATION_MODEL,
      generation_context: {
        mode: "summary",
        provider: llmCard.model ? "openai" : "rule",
        variant: nextCard.cardType,
        customInstruction: Boolean(params.instruction?.trim())
      }
    })
    .select("id, card_type")
    .single();
  if (error) throw error;

  await logLearningEvent({
    eventType: "cards_generated",
    entityId: params.sourceId,
    payload: { count: 1, card_type: nextCard.cardType }
  });

  await logLearningEvent({
    eventType: "card_accepted",
    entityId: insertedCard.id,
    payload: { source_id: params.sourceId, card_type: insertedCard.card_type }
  });
}

export async function updateCard(params: {
  cardId: string;
  sourceId: string;
  prompt: string;
  answer: string;
  cardType: CardType;
}) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();

  const { error } = await supabase
    .from("cards")
    .update({
      prompt: params.prompt,
      answer: params.answer,
      card_type: params.cardType
    })
    .eq("id", params.cardId)
    .eq("source_id", params.sourceId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteCard(params: { cardId: string; sourceId: string }) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();

  const { error: eventsError } = await supabase
    .from("learning_events")
    .delete()
    .eq("user_id", userId)
    .eq("entity_id", params.cardId);
  if (eventsError) throw eventsError;

  const { error: cardError } = await supabase
    .from("cards")
    .delete()
    .eq("id", params.cardId)
    .eq("source_id", params.sourceId)
    .eq("user_id", userId);
  if (cardError) throw cardError;
}

export async function listDueCards() {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as CardRow[];
}

export async function countDueCards(userId?: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const resolvedUserId = userId ?? (await appUserId());
  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", resolvedUserId)
    .eq("status", "active")
    .lte("due_at", nowIso);

  if (error) throw error;
  return count ?? 0;
}

export async function countReviewQueueItemsForUser(userId: string): Promise<number> {
  const [dueCardsCount, unrefinedIdeasCount] = await Promise.all([
    countDueCards(userId),
    countUnrefinedIdeas(userId)
  ]);

  return dueCardsCount + unrefinedIdeasCount;
}

export async function listDueCardsWithContext(): Promise<DueReviewCard[]> {
  const dueCards = await listDueCards();
  if (!dueCards.length) return [];

  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
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
  const userId = await appUserId();
  const { data, error } = await supabase
    .from("learning_events")
    .select("created_at, payload")
    .eq("user_id", userId)
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

export async function listCardAnswerHistoryMap(cardIds: string[]) {
  if (!cardIds.length) return {} as Record<string, CardAnswerHistoryItem[]>;

  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const { data, error } = await supabase
    .from("learning_events")
    .select("entity_id, created_at, payload")
    .eq("user_id", userId)
    .eq("event_type", "review_completed")
    .in("entity_id", cardIds)
    .order("created_at", { ascending: false })
    .limit(Math.max(50, cardIds.length * 10));

  if (error) throw error;

  const historyByCardId: Record<string, CardAnswerHistoryItem[]> = {};

  for (const cardId of cardIds) {
    historyByCardId[cardId] = [];
  }

  for (const row of data ?? []) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const userAnswer = typeof payload.user_answer === "string" ? payload.user_answer.trim() : "";
    const cardId = typeof row.entity_id === "string" ? row.entity_id : "";
    if (!userAnswer || !cardId) continue;

    const current = historyByCardId[cardId] ?? [];
    if (current.length >= 10) continue;
    current.push({
      created_at: row.created_at,
      user_answer: userAnswer
    });
    historyByCardId[cardId] = current;
  }

  return historyByCardId;
}

export async function countReviewsCompletedToday(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const now = new Date();
  const dayStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  ).toISOString();

  const { count, error } = await supabase
    .from("learning_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "review_completed")
    .gte("created_at", dayStartUtc);

  if (error) throw error;
  return count ?? 0;
}

export async function completeReview(
  cardId: string,
  schedule: "soon" | "near" | "later",
  userAnswer?: string
) {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
  const reviewedAt = new Date();
  const laterDays = schedule === "later" ? randomIntInclusive(10, 50) : null;
  const dueAt =
    schedule === "soon"
      ? shiftMinutes(reviewedAt, 3)
      : schedule === "near"
        ? shiftDays(reviewedAt, 1)
        : shiftDays(reviewedAt, laterDays ?? 10);
  const rating = schedule === "soon" ? 0 : schedule === "near" ? 1 : 2;
  const intervalDays = schedule === "soon" ? 0 : schedule === "near" ? 1 : (laterDays ?? 10);

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
      interval_days: intervalDays,
      reps: 1
    })
    .eq("id", cardId)
    .eq("user_id", userId);
  if (cardError) throw cardError;

  await logLearningEvent({
    eventType: "review_completed",
    entityId: cardId,
    payload: {
      rating,
      schedule,
      interval_days: intervalDays,
      user_answer: userAnswer?.trim() || null
    }
  });
}

function normalize(value: number, cap: number): number {
  return Math.min(1, value / cap);
}

export async function getProgressSnapshot(): Promise<ProgressSnapshot> {
  const supabase = getSupabaseAdmin();
  const userId = await appUserId();
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
      lmsScore: 0
    });
  }

  for (const event of events ?? []) {
    const key = event.created_at.slice(0, 10);
    const point = daily.get(key);
    if (!point) continue;
    if (event.event_type === "review_completed") point.reviewsCount += 1;
    if (event.event_type === "card_accepted") point.acceptedCount += 1;
  }

  for (const point of daily.values()) {
    const score =
      0.5 * normalize(point.reviewsCount, 10) +
      0.5 * normalize(point.acceptedCount, 5);
    point.lmsScore = Number(score.toFixed(4));
  }

  const trend = Array.from(daily.values());
  const trend30 = trend.filter((point) => point.date >= from30.slice(0, 10));
  const activeDays = trend30.filter((point) => point.reviewsCount > 0).length;
  const accepted30 = trend30.reduce((sum, point) => sum + point.acceptedCount, 0);
  const todayKey = toIsoDate(now);
  const todayDelta = trend.find((point) => point.date === todayKey)?.lmsScore ?? 0;

  return {
    activeReviewDays30: activeDays,
    cardsAccepted30: accepted30,
    todayDelta,
    lmsTrend90: trend
  };
}
