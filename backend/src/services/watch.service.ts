import {
  createInvestigationWatch,
  deleteInvestigationWatch,
  findInvestigationWatchById,
  isUniqueViolation,
  listInvestigationWatches,
  updateInvestigationWatch,
  type InvestigationWatchRow,
} from "../repositories/watch.repository.js";
import { listRecentWatchEvents, type WatchDiffEventRow } from "../repositories/watchDiff.repository.js";

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

function mapWatch(row: InvestigationWatchRow): InvestigationWatch {
  return {
    id: row.id,
    cnpjBasico: row.cnpj_basico,
    label: row.label,
    notes: row.notes,
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createWatch(input: {
  cnpjBasico: string;
  label?: string | null;
  notes?: string | null;
}): Promise<InvestigationWatch> {
  try {
    const row = await createInvestigationWatch(input);
    return mapWatch(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("WATCH_ALREADY_EXISTS");
    }
    throw error;
  }
}

export async function listWatches(): Promise<InvestigationWatch[]> {
  const rows = await listInvestigationWatches();
  return rows.map(mapWatch);
}

export async function getWatchById(id: string): Promise<InvestigationWatch | null> {
  const row = await findInvestigationWatchById(id);
  return row ? mapWatch(row) : null;
}

export async function updateWatch(
  id: string,
  input: {
    label?: string | null;
    notes?: string | null;
    lastCheckedAt?: string | null;
  },
): Promise<InvestigationWatch | null> {
  const row = await updateInvestigationWatch(id, input);
  return row ? mapWatch(row) : null;
}

export async function deleteWatch(id: string): Promise<boolean> {
  return deleteInvestigationWatch(id);
}

function mapWatchEvent(row: WatchDiffEventRow): InvestigationWatchEvent {
  return {
    id: row.id,
    watchId: row.watch_id,
    category: row.category,
    changeType: row.changeType,
    description: row.description,
    createdAt: row.created_at,
  };
}

export async function listWatchEvents(watchId: string, limit = 10): Promise<InvestigationWatchEvent[]> {
  const watch = await findInvestigationWatchById(watchId);
  if (!watch) {
    throw new Error("WATCH_NOT_FOUND");
  }

  const rows = await listRecentWatchEvents(watchId, limit);
  return rows.map(mapWatchEvent);
}
