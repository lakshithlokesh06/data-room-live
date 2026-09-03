import "server-only";

import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/types";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function listCurrentUserWorkspaces(): Promise<Workspace[]> {
  if (!getSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, description, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as WorkspaceRow[]).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    createdBy: workspace.created_by,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
  }));
}
