import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/env";
import { getSafeRedirectPath } from "@/lib/validation/auth";

const protectedRoutes = ["/dashboard", "/workspaces", "/datasets", "/activity"];
const authRoutes = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  let supabaseResponse = NextResponse.next({ request });

  if (!config) {
    if (isProtectedRoute) {
      return redirectWithNextParam(request, "/login", supabaseResponse);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (isProtectedRoute && !claims?.sub) {
    return redirectWithNextParam(request, "/login", supabaseResponse);
  }

  if (isAuthRoute && claims?.sub) {
    const redirectTo = getSafeRedirectPath(
      request.nextUrl.searchParams.get("next"),
      "/dashboard"
    );
    return redirectWithCookies(new URL(redirectTo, request.url), supabaseResponse);
  }

  return supabaseResponse;
}

function redirectWithNextParam(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse
) {
  const redirectUrl = new URL(pathname, request.url);
  redirectUrl.searchParams.set("next", request.nextUrl.pathname);

  return redirectWithCookies(redirectUrl, supabaseResponse);
}

function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  ["cache-control", "expires", "pragma"].forEach((header) => {
    const value = supabaseResponse.headers.get(header);
    if (value) {
      response.headers.set(header, value);
    }
  });

  return response;
}
