"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updatePasswordAction(formData: FormData) {
  const password = asString(formData.get("password"));
  const confirmPassword = asString(formData.get("confirmPassword"));

  if (password.length < 8) {
    redirect("/reset-password?error=password-too-short");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=password-mismatch");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    const params = new URLSearchParams({
      error: "update-failed"
    });

    if (error.message) {
      params.set("errorMessage", error.message);
    }

    redirect(`/reset-password?${params.toString()}`);
  }

  revalidatePath("/", "layout");
  redirect("/login?mode=signin&success=password-reset-complete");
}
