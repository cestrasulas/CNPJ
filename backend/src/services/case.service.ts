import {
  addInvestigationCaseEntity,
  createInvestigationCase,
  findInvestigationCaseById,
  listInvestigationCaseEntities,
  listInvestigationCases,
  type CaseStatus,
} from "../repositories/case.repository.js";

export type InvestigationCase = {
  id: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  entityCount?: number;
};

export type InvestigationCaseEntity = {
  id: string;
  caseId: string;
  entityType: string;
  entityValue: string;
  entityLabel: string | null;
  createdAt: string;
};

export type InvestigationCaseDetail = InvestigationCase & {
  entities: InvestigationCaseEntity[];
};

function mapCase(row: {
  id: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  entity_count?: number;
}): InvestigationCase {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entityCount: row.entity_count,
  };
}

function mapEntity(row: {
  id: string;
  case_id: string;
  entity_type: string;
  entity_value: string;
  entity_label: string | null;
  created_at: string;
}): InvestigationCaseEntity {
  return {
    id: row.id,
    caseId: row.case_id,
    entityType: row.entity_type,
    entityValue: row.entity_value,
    entityLabel: row.entity_label,
    createdAt: row.created_at,
  };
}

export async function createCase(input: {
  title: string;
  description?: string | null;
  status?: CaseStatus;
}): Promise<InvestigationCase> {
  const row = await createInvestigationCase(input);
  return mapCase(row);
}

export async function listCases(): Promise<InvestigationCase[]> {
  const rows = await listInvestigationCases();
  return rows.map(mapCase);
}

export async function getCaseById(id: string): Promise<InvestigationCaseDetail | null> {
  const row = await findInvestigationCaseById(id);
  if (!row) return null;

  const entities = await listInvestigationCaseEntities(id);
  return {
    ...mapCase(row),
    entities: entities.map(mapEntity),
  };
}

export async function addCaseEntity(input: {
  caseId: string;
  entityType: string;
  entityValue: string;
  entityLabel?: string | null;
}): Promise<InvestigationCaseEntity> {
  const existing = await findInvestigationCaseById(input.caseId);
  if (!existing) {
    throw new Error("CASE_NOT_FOUND");
  }

  const row = await addInvestigationCaseEntity(input);
  return mapEntity(row);
}
