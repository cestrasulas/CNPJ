import {
  createInvestigationWatch,
  deleteInvestigationWatch,
  findInvestigationWatchById,
  isUniqueViolation,
  listInvestigationWatches,
  updateInvestigationWatch,
  type InvestigationWatchRow,
} from "../repositories/watch.repository.js";

export type InvestigationWatch = {
  id: string;
  cnpjBasico: string;
  label: string | null;
  notes: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
