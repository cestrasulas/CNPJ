import { receitaPool } from "../lib/receitaDb.js";

export type InvestigationWatchRow = {
  id: string;
  cnpj_basico: string;
  label: string | null;
  notes: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function createInvestigationWatch(input: {
  cnpjBasico: string;
  label?: string | null;
  notes?: string | null;
}): Promise<InvestigationWatchRow> {
  const { rows } = await receitaPool.query<InvestigationWatchRow>(
    `
      insert into investigation_watch (cnpj_basico, label, notes)
      values ($1, $2, $3)
      returning
        id,
        cnpj_basico,
        label,
        notes,
        last_checked_at::text,
        created_at::text,
        updated_at::text
    `,
    [input.cnpjBasico, input.label ?? null, input.notes ?? null],
  );

  return rows[0];
}

export async function listInvestigationWatches(): Promise<InvestigationWatchRow[]> {
  const { rows } = await receitaPool.query<InvestigationWatchRow>(
    `
      select
        id,
        cnpj_basico,
        label,
        notes,
        last_checked_at::text,
        created_at::text,
        updated_at::text
      from investigation_watch
      order by updated_at desc
    `,
  );

  return rows;
}

export async function findInvestigationWatchById(id: string): Promise<InvestigationWatchRow | null> {
  const { rows } = await receitaPool.query<InvestigationWatchRow>(
    `
      select
        id,
        cnpj_basico,
        label,
        notes,
        last_checked_at::text,
        created_at::text,
        updated_at::text
      from investigation_watch
      where id = $1
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function updateInvestigationWatch(
  id: string,
  input: {
    label?: string | null;
    notes?: string | null;
    lastCheckedAt?: string | null;
  },
): Promise<InvestigationWatchRow | null> {
  const fields: string[] = [];
  const values: unknown[] = [id];

  if (input.label !== undefined) {
    values.push(input.label);
    fields.push(`label = $${values.length}`);
  }
  if (input.notes !== undefined) {
    values.push(input.notes);
    fields.push(`notes = $${values.length}`);
  }
  if (input.lastCheckedAt !== undefined) {
    values.push(input.lastCheckedAt);
    fields.push(`last_checked_at = $${values.length}`);
  }

  if (fields.length === 0) {
    return findInvestigationWatchById(id);
  }

  fields.push("updated_at = now()");

  const { rows } = await receitaPool.query<InvestigationWatchRow>(
    `
      update investigation_watch
      set ${fields.join(", ")}
      where id = $1
      returning
        id,
        cnpj_basico,
        label,
        notes,
        last_checked_at::text,
        created_at::text,
        updated_at::text
    `,
    values,
  );

  return rows[0] ?? null;
}

export async function deleteInvestigationWatch(id: string): Promise<boolean> {
  const { rowCount } = await receitaPool.query(
    `
      delete from investigation_watch
      where id = $1
    `,
    [id],
  );

  return (rowCount ?? 0) > 0;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code: string }).code === "23505"
  );
}
