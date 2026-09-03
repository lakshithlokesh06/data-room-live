import { workspaceRoles, type WorkspaceRole } from "@/types";

export type WorkspaceInput = {
  name: string;
  description?: string | null;
};

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return workspaceRoles.includes(value as WorkspaceRole);
}

export function validateWorkspaceInput(input: WorkspaceInput) {
  const name = input.name.trim();
  const description = input.description?.trim() || null;

  if (name.length < 2 || name.length > 120) {
    return {
      ok: false as const,
      message: "Workspace name must be between 2 and 120 characters.",
      fields: { name, description: description ?? "" },
    };
  }

  if (description && description.length > 500) {
    return {
      ok: false as const,
      message: "Description must be 500 characters or fewer.",
      fields: { name, description },
    };
  }

  return {
    ok: true as const,
    data: { name, description },
  };
}
