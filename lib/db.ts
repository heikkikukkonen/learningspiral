import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CardType, SourceType } from "@/lib/types";

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
  created_at: string;
}

export interface SummaryRow {
  id: string;
  user_id: string;
  source_id: string;
  content: string;
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
  created_at: string;
  updated_at: string;
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
      tags: input.tags?.length ? input.tags : []
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SourceRow;
}

export async function getSourceWithDetails(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();

  const [{ data: source, error: sourceError }, { data: summary, error: summaryError }, { data: cards, error: cardsError }] =
    await Promise.all([
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
        .order("created_at", { ascending: false })
    ]);

  if (sourceError) throw sourceError;
  if (summaryError) throw summaryError;
  if (cardsError) throw cardsError;

  return {
    source: source as SourceRow | null,
    summary: summary as SummaryRow | null,
    cards: (cards ?? []) as CardRow[]
  };
}

export async function upsertSummary(sourceId: string, content: string) {
  const supabase = getSupabaseAdmin();
  const userId = appUserId();
  const summaryId = randomUUID();

  const { data, error } = await supabase
    .from("summaries")
    .upsert(
      {
        id: summaryId,
        user_id: userId,
        source_id: sourceId,
        content,
        source: "manual"
      },
      { onConflict: "source_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
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

  const cards = [
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "recall",
      prompt: "Mikä on tämän tiivistelmän tärkein väite?",
      answer: trimmed.slice(0, 280)
    },
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "apply",
      prompt: "Miten sovellat tätä ideaa seuraavaan oikeaan tilanteeseen?",
      answer: "Valitse yksi päätös ja testaa tätä periaatetta käytännössä viikon aikana."
    },
    {
      user_id: userId,
      source_id: params.sourceId,
      summary_id: params.summaryId,
      status: "suggested",
      card_type: "reflect",
      prompt: "Mikä tässä ideassa haastaa nykyisen ajattelutapasi?",
      answer: "Kirjaa yksi oletus, jonka päivität tämän lähteen perusteella."
    }
  ];

  const { error } = await supabase.from("cards").insert(cards);
  if (error) throw error;
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
}

export async function acceptAllSuggested(sourceId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("cards")
    .update({
      status: "active",
      due_at: new Date().toISOString()
    })
    .eq("source_id", sourceId)
    .eq("user_id", appUserId())
    .eq("status", "suggested");

  if (error) throw error;
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
