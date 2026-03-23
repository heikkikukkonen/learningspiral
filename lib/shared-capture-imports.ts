import { requireUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizeSharedImageCaptureContext,
  type SharedImageCaptureContext
} from "@/lib/shared-image-capture";

const SHARED_CAPTURE_IMPORT_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export interface SharedCaptureImportRecord extends SharedImageCaptureContext {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64Data: string;
  createdAt: string;
}

function staleCutoffIso() {
  return new Date(Date.now() - SHARED_CAPTURE_IMPORT_MAX_AGE_MS).toISOString();
}

async function cleanupStaleSharedCaptureImports(userId: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("shared_capture_imports")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", staleCutoffIso());
}

export async function createSharedCaptureImport(input: {
  fileName: string;
  mimeType: string;
  bytes?: Uint8Array;
  sharedTitle?: string;
  sharedText?: string;
  sharedUrl?: string;
}) {
  const supabase = getSupabaseAdmin();
  const userId = await requireUserId();
  const context = normalizeSharedImageCaptureContext({
    sharedTitle: input.sharedTitle,
    sharedText: input.sharedText,
    sharedUrl: input.sharedUrl
  });

  await cleanupStaleSharedCaptureImports(userId);

  const bytes = input.bytes ?? new Uint8Array();

  const { data, error } = await supabase
    .from("shared_capture_imports")
    .insert({
      user_id: userId,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size: bytes.byteLength,
      base64_data: Buffer.from(bytes).toString("base64"),
      shared_title: context?.sharedTitle ?? null,
      shared_text: context?.sharedText ?? null,
      shared_url: context?.sharedUrl ?? null
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getSharedCaptureImport(importId: string) {
  const supabase = getSupabaseAdmin();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("shared_capture_imports")
    .select("*")
    .eq("id", importId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (Date.parse(data.created_at) < Date.now() - SHARED_CAPTURE_IMPORT_MAX_AGE_MS) {
    await deleteSharedCaptureImport(importId);
    return null;
  }

  return {
    id: data.id as string,
    fileName: data.file_name as string,
    mimeType: data.mime_type as string,
    fileSize: data.file_size as number,
    base64Data: data.base64_data as string,
    sharedTitle: (data.shared_title as string | null) ?? undefined,
    sharedText: (data.shared_text as string | null) ?? undefined,
    sharedUrl: (data.shared_url as string | null) ?? undefined,
    createdAt: data.created_at as string
  } satisfies SharedCaptureImportRecord;
}

export async function deleteSharedCaptureImport(importId: string) {
  const supabase = getSupabaseAdmin();
  const userId = await requireUserId();

  const { error } = await supabase
    .from("shared_capture_imports")
    .delete()
    .eq("id", importId)
    .eq("user_id", userId);

  if (error) throw error;
}

export const createSharedImageImport = createSharedCaptureImport;
export const getSharedImageImport = getSharedCaptureImport;
export const deleteSharedImageImport = deleteSharedCaptureImport;
