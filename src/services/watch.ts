import { apiDelete, apiGet, apiPost } from "./api";

export type InvestigationWatch = {
  id: string;
  cnpjBasico: string;
  label: string | null;
  notes: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestigationWatchEvent = {
  id: string;
  watchId: string;
  category: "partners" | "phones" | "emails";
  changeType: "added" | "removed" | "baseline";
  description: string;
  createdAt: string;
};

export async function listarWatches(): Promise<InvestigationWatch[]> {
  const response = await apiGet<{ data: InvestigationWatch[] }>("/api/watch");
  return response.data;
}

export async function criarWatch(input: {
  cnpjBasico: string;
  label?: string | null;
  notes?: string | null;
}): Promise<InvestigationWatch> {
  return apiPost<InvestigationWatch>("/api/watch", input);
}

export async function removerWatch(id: string): Promise<void> {
  await apiDelete(`/api/watch/${id}`);
}

export async function listarEventosWatch(watchId: string, limit = 10): Promise<InvestigationWatchEvent[]> {
  const response = await apiGet<{ data: InvestigationWatchEvent[] }>(`/api/watch/${watchId}/events?limit=${limit}`);
  return response.data;
}
