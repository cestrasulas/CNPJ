import { receitaPool } from "../lib/receitaDb.js";

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type InvestigationCaseRow = {
  id: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  entity_count?: number;
};

export type InvestigationCaseEntityRow = {
  id: string;
  case_id: string;
  entity_type: string;
  entity_value: string;
  entity_label: string | null;
  created_at: string;
};

export async function createInvestigationCase(input: {
  title: string;
  description?: string | null;
  status?: CaseStatus;
}): Promise<InvestigationCaseRow> {
  const { rows } = await receitaPool.query<InvestigationCaseRow>(
    `
      insert into investigation_case (title, description, status)
      values ($1, $2, $3)
      returning id, title, description, status, created_at::text, updated_at::text
    `,
    [input.title, input.description ?? null, input.status ?? "OPEN"],
  );

  return rows[0];
}

export async function listInvestigationCases(): Promise<InvestigationCaseRow[]> {
  const { rows } = await receitaPool.query<InvestigationCaseRow>(
    `
      select
        c.id,
        c.title,
        c.description,
        c.status,
        c.created_at::text,
        c.updated_at::text,
        count(e.id)::int as entity_count
      from investigation_case c
      left join investigation_case_entities e on e.case_id = c.id
      group by c.id
      order by c.updated_at desc
    `,
  );

  return rows;
}

export async function findInvestigationCaseById(id: string): Promise<InvestigationCaseRow | null> {
  const { rows } = await receitaPool.query<InvestigationCaseRow>(
    `
      select id, title, description, status, created_at::text, updated_at::text
      from investigation_case
      where id = $1
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function listInvestigationCaseEntities(caseId: string): Promise<InvestigationCaseEntityRow[]> {
  const { rows } = await receitaPool.query<InvestigationCaseEntityRow>(
    `
      select id, case_id, entity_type, entity_value, entity_label, created_at::text
      from investigation_case_entities
      where case_id = $1
      order by created_at asc
    `,
    [caseId],
  );

  return rows;
}

export async function addInvestigationCaseEntity(input: {
  caseId: string;
  entityType: string;
  entityValue: string;
  entityLabel?: string | null;
}): Promise<InvestigationCaseEntityRow> {
  await receitaPool.query(
    `
      update investigation_case
      set updated_at = now()
      where id = $1
    `,
    [input.caseId],
  );

  const { rows } = await receitaPool.query<InvestigationCaseEntityRow>(
    `
      insert into investigation_case_entities (case_id, entity_type, entity_value, entity_label)
      values ($1, $2, $3, $4)
      on conflict (case_id, entity_type, entity_value)
      do update set entity_label = coalesce(excluded.entity_label, investigation_case_entities.entity_label)
      returning id, case_id, entity_type, entity_value, entity_label, created_at::text
    `,
    [input.caseId, input.entityType, input.entityValue, input.entityLabel ?? null],
  );

  return rows[0];
}
