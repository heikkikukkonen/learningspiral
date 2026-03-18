"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { getBaseUrl, getSafeNextPath } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

const oauthProviders: Provider[] = ["google", "apple", "github", "azure"];

export async function signInAction(formData: FormData) {
  const email = asString(formData.get("email")).toLowerCase();
  const password = asString(formData.get("password"));
  const nextPath = getSafeNextPath(asString(formData.get("next")));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?mode=signin&error=signin&next=${encodeURIComponent(nextPath)}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signUpAction(formData: FormData) {
  const fullName = asString(formData.get("fullName"));
  const email = asString(formData.get("email")).toLowerCase();
  const password = asString(formData.get("password"));
  const motivation = asString(formData.get("motivation"));
  const nextPath = getSafeNextPath(asString(formData.get("next")));
  const supabase = createSupabaseServerClient();
  const emailRedirectTo = `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
        motivation
      }
    }
  });

  if (error) {
    redirect(`/login?mode=signup&error=signup&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(`/login?mode=signup&success=check-email&next=${encodeURIComponent(nextPath)}`);
}

export async function signInWithOAuthAction(formData: FormData) {
  const providerValue = asString(formData.get("provider")) as Provider;
  const nextPath = getSafeNextPath(asString(formData.get("next")));

  if (!oauthProviders.includes(providerValue)) {
    redirect(`/login?error=oauth-provider&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = createSupabaseServerClient();
  const redirectTo = `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerValue,
    options: {
      redirectTo
    }
  });

  if (error || !data.url) {
    redirect(`/login?error=oauth-start&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?signedOut=1");
}
