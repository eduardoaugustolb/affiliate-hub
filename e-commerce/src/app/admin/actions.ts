"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { login, logout } from "@/data/auth";
import {
  createOption,
  createOutfit,
  deleteOption,
  deleteOutfit,
} from "@/data/catalog";
import { deleteProduct, saveProduct, setProductOptions } from "@/data/products";
import { type ActionResult, AdminError } from "@/lib/admin";

async function execute<T>(
  operation: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const value = await operation();
    revalidatePath("/admin", "layout");
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
export async function loginAction(input: unknown) {
  return execute(() => login(input));
}
export async function logoutAction() {
  return execute(() => logout());
}
export async function saveProductAction(code: unknown, input: unknown) {
  return execute(() => saveProduct(code, input));
}
export async function deleteProductAction(code: unknown) {
  return execute(() => deleteProduct(code));
}
export async function setProductOptionsAction(code: unknown, input: unknown) {
  return execute(() => setProductOptions(code, input));
}
export async function createOptionAction(category: unknown, name: unknown) {
  return execute(() => createOption(category, name));
}
export async function deleteOptionAction(id: unknown) {
  return execute(() => deleteOption(id));
}
export async function createOutfitAction(input: unknown) {
  return execute(() => createOutfit(input));
}
export async function deleteOutfitAction(code: unknown) {
  return execute(() => deleteOutfit(code));
}
