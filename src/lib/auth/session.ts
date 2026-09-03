import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  if (!getSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  return {
    id: user.id,
    email: user.email,
    fullName:
      profile?.full_name ??
      getStringMetadata(user.user_metadata.full_name) ??
      null,
    avatarUrl:
      profile?.avatar_url ??
      getStringMetadata(user.user_metadata.avatar_url) ??
      null,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

function getStringMetadata(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
