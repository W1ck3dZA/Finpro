import { api } from "./client";
import type { Client, Paginated } from "./types";

export interface ClientFilters {
  search?: string;
  jobManager?: string;
  businessStructure?: string;
  clientType?: string;
  isStub?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  /** Returns every matching row (ignoring pagination), for CSV export. */
  export?: boolean;
}

export async function listClients(filters: ClientFilters = {}): Promise<Paginated<Client>> {
  const { data } = await api.get("/clients", { params: filters });
  return data;
}

export async function getClient(id: number): Promise<Client> {
  const { data } = await api.get(`/clients/${id}`);
  return data;
}
