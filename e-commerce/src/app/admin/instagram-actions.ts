"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import {
  deleteInstagramCampaign,
  previewInstagramCampaign,
  saveInstagramCampaign,
} from "@/data/instagram";
import { type ActionResult, AdminError } from "@/lib/admin";

async function execute<T>(
  operation: () => Promise<T>,
  revalidate = true,
): Promise<ActionResult<T>> {
  try {
    const value = await operation();
    if (revalidate) revalidatePath("/admin/instagram");
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      status: error instanceof AdminError ? error.status : 500,
      message:
        error instanceof AdminError
          ? error.message
          : "Não foi possível concluir. Tente novamente.",
    };
  }
}
export async function saveInstagramCampaignAction(
  id: unknown,
  configuration: unknown,
) {
  return execute(() => saveInstagramCampaign(id, configuration));
}
export async function deleteInstagramCampaignAction(id: unknown) {
  return execute(() => deleteInstagramCampaign(id));
}
export async function previewInstagramCampaignAction(
  configuration: unknown,
  sample: unknown,
) {
  return execute(() => previewInstagramCampaign(configuration, sample), false);
}
