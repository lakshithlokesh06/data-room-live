import { type NextRequest, NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/validation/auth";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");

  if (!code || !getSupabaseConfig()) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined
  );

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
