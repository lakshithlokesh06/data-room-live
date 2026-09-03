"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/auth/action-state";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { validateWorkspaceInput } from "@/lib/validation/workspace";

export async function createWorkspaceAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const validation = validateWorkspaceInput({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
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
        name: validation.data.name,
        description: validation.data.description ?? "",
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: validation.data.name,
    workspace_description: validation.data.description,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
      fields: {
        name: validation.data.name,
        description: validation.data.description ?? "",
      },
    };
  }

  revalidatePath("/workspaces");

  return {
    status: "success",
    message: "Workspace created.",
  };
}
