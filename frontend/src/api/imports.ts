import { api } from "./client";
import type { ImportBatchListItem, ImportResult, Paginated } from "./types";

export async function uploadImport(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/imports", form, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}

export async function listImports(page = 1): Promise<Paginated<ImportBatchListItem>> {
  const { data } = await api.get("/imports", { params: { page } });
  return data;
}

export async function getImport(id: number): Promise<ImportBatchListItem & { warnings: unknown[] }> {
  const { data } = await api.get(`/imports/${id}`);
  return data;
}
