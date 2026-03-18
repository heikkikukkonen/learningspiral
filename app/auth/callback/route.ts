import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth";

function buildRedirectUrl(origin: string, nextPath: string) {
  return new URL(nextPath, origin);
}

function buildSignupActivationRedirect(origin: string, nextPath: string) {
  const redirectUrl = new URL("/login", origin);
  redirectUrl.searchParams.set("mode", "signin");
  redirectUrl.searchParams.set("success", "activated");
  redirectUrl.searchParams.set("next", nextPath);
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(buildRedirectUrl(url.origin, nextPath));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType
    });

    if (!error) {
      if (type === "signup") {
        await supabase.auth.signOut();
        return NextResponse.redirect(buildSignupActivationRedirect(url.origin, nextPath));
      }

      return NextResponse.redirect(buildRedirectUrl(url.origin, nextPath));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth-callback", url.origin));
}
