"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/auth/action-state";
import { uploadDataset } from "@/lib/datasets/upload";

export async function uploadDatasetAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await uploadDataset(formData);

  if (result.status === "success") {
    revalidatePath("/datasets");
    redirect(`/datasets/${result.message}`);
  }

  return result;
}
