"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/auth/action-state";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { validateLoginInput, validateSignupInput } from "@/lib/validation/auth";

export async function signInAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validation = validateLoginInput({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? ""),
  });

  if (!validation.ok) {
    return {
      status: "error",
      message: validation.message,
      fields: validation.fields,
    };
  }

  if (!getSupabaseConfig()) {
    return {
      status: "error",
      message: "Supabase is not configured for this environment.",
      fields: { email: validation.data.email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
      fields: { email: validation.data.email },
    };
  }

  revalidatePath("/", "layout");
  redirect(validation.data.next ?? "/dashboard");
}

export async function signUpAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validation = validateSignupInput({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!validation.ok) {
    return {
      status: "error",
      message: validation.message,
      fields: validation.fields,
    };
  }

  if (!getSupabaseConfig()) {
    return {
      status: "error",
      message: "Supabase is not configured for this environment.",
      fields: {
        fullName: validation.data.fullName,
        email: validation.data.email,
      },
    };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      data: {
        full_name: validation.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
      fields: {
        fullName: validation.data.fullName,
        email: validation.data.email,
      },
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "Check your email to confirm your account, then sign in.",
    fields: {
      fullName: validation.data.fullName,
      email: validation.data.email,
    },
  };
}

export async function signOutAction(): Promise<void> {
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
