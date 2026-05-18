import { receitaPool } from "../lib/receitaDb.js";

type Empresa = {
  cnpjBasico: string;
  razaoSocial: string | null;
  naturezaJuridica: string | null;
  qualificacaoResponsavel: string | null;
  capitalSocial: string | null;
  porte: string | null;
};

type Estabelecimento = {
  cnpjCompleto: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  cnaePrincipal: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  enderecoNormalizado?: string | null;
};

type Socio = {
  nome: string | null;
  documento: string | null;
  qualificacao: string | null;
  dataEntrada: string | null;
};

type Relation = {
  type: "same_partner" | "same_address" | "same_root" | "same_phone" | "same_email";
  score: number;
  reason: string;
  company: Empresa;
};

type GraphNode = {
  id: string;
  type: "company" | "partner" | "address";
  label: string;
};

type GraphEdge = {
  from: string;
  to: string;
  type: string;
  label: string;
};

export async function buildInvestigationReport(cnpjBasico: string) {
  const target = await findEmpresa(cnpjBasico);
  const estabelecimentos = await listEstabelecimentos(cnpjBasico);
  const socios = await listSocios(cnpjBasico);
  const relations = limitRelations([
    ...buildBranchRelations(target, estabelecimentos),
    ...(await findSamePartnerRelations(cnpjBasico, socios)),
    ...(await findSameAddressRelations(cnpjBasico, estabelecimentos)),
    ...(await findSameContactRelations(cnpjBasico, estabelecimentos, "phone")),
    ...(await findSameContactRelations(cnpjBasico, estabelecimentos, "email")),
  ]);

  return {
    target: {
      company: target,
      establishments: estabelecimentos.map(stripInternalEstablishment),
      partners: socios,
    },
    summary: {
      totalPartners: socios.length,
      totalRelatedByPartner: relations.filter((item) => item.type === "same_partner").length,
      totalRelatedByAddress: relations.filter((item) => item.type === "same_address").length,
      totalBranches: estabelecimentos.length,
      riskHints: buildRiskHints(estabelecimentos, socios, relations),
    },
    relations,
    graph: buildGraph(target, estabelecimentos, socios, relations),
  };
}

async function findEmpresa(cnpjBasico: string): Promise<Empresa> {
  const { rows } = await receitaPool.query(
    `
      select cnpj_basico, razao_social, natureza_juridica, qualificacao_responsavel, capital_social::text, porte
      from receita_empresas
      where cnpj_basico = $1
      limit 1
    `,
    [cnpjBasico],
  );

  const row = rows[0];
  return {
    cnpjBasico,
    razaoSocial: row?.razao_social ?? null,
    naturezaJuridica: row?.natureza_juridica ?? null,
    qualificacaoResponsavel: row?.qualificacao_responsavel ?? null,
    capitalSocial: row?.capital_social ?? null,
    porte: row?.porte ?? null,
  };
}

async function listEstabelecimentos(cnpjBasico: string): Promise<Estabelecimento[]> {
  const { rows } = await receitaPool.query(
    `
      select cnpj, nome_fantasia, situacao_cadastral, cnae_fiscal_principal, municipio, uf,
             telefone1_normalizado, email, endereco_normalizado
      from receita_estabelecimentos
      where cnpj_basico = $1
      order by cnpj_ordem asc
      limit 50
    `,
    [cnpjBasico],
  );

  return rows.map((row) => ({
    cnpjCompleto: row.cnpj,
    nomeFantasia: row.nome_fantasia,
    situacaoCadastral: row.situacao_cadastral,
    cnaePrincipal: row.cnae_fiscal_principal,
    municipio: row.municipio,
    uf: row.uf,
    telefone: row.telefone1_normalizado,
    email: row.email,
    enderecoNormalizado: row.endereco_normalizado,
  }));
}

async function listSocios(cnpjBasico: string): Promise<Socio[]> {
  const { rows } = await receitaPool.query(
    `
      select nome_socio, cnpj_cpf_socio, qualificacao_socio, data_entrada_sociedade::text
      from receita_socios
      where cnpj_basico = $1
      limit 50
    `,
    [cnpjBasico],
  );

  return rows.map((row) => ({
    nome: row.nome_socio,
    documento: row.cnpj_cpf_socio,
    qualificacao: row.qualificacao_socio,
    dataEntrada: row.data_entrada_sociedade,
  }));
}

function buildBranchRelations(target: Empresa, estabelecimentos: Estabelecimento[]): Relation[] {
  if (estabelecimentos.length <= 1) return [];

  return [
    {
      type: "same_root",
      score: 20,
      reason: `${estabelecimentos.length} estabelecimentos compartilham o mesmo CNPJ básico.`,
      company: target,
    },
  ];
}

async function findSamePartnerRelations(cnpjBasico: string, socios: Socio[]): Promise<Relation[]> {
  const keys = socios.map((socio) => socio.documento || socio.nome).filter(Boolean);
  if (keys.length === 0) return [];

  const { rows } = await receitaPool.query(
    `
      select distinct e.cnpj_basico, e.razao_social, e.natureza_juridica, e.qualificacao_responsavel,
             e.capital_social::text, e.porte, s.nome_socio
      from receita_socios s
      join receita_empresas e on e.cnpj_basico = s.cnpj_basico
      where s.cnpj_basico <> $1
        and (s.cnpj_cpf_socio = any($2::text[]) or s.nome_socio = any($2::text[]))
      limit 20
    `,
    [cnpjBasico, keys],
  );

  return rows.map((row) => ({
    type: "same_partner",
    score: 50,
    reason: `Sócio em comum: ${row.nome_socio || "não identificado"}.`,
    company: mapEmpresaRow(row),
  }));
}

async function findSameAddressRelations(cnpjBasico: string, estabelecimentos: Estabelecimento[]): Promise<Relation[]> {
  const addresses = estabelecimentos.map((item) => item.enderecoNormalizado).filter(Boolean);
  if (addresses.length === 0) return [];

  const { rows } = await receitaPool.query(
    `
      select distinct emp.cnpj_basico, emp.razao_social, emp.natureza_juridica, emp.qualificacao_responsavel,
             emp.capital_social::text, emp.porte, est.endereco_normalizado
      from receita_estabelecimentos est
      join receita_empresas emp on emp.cnpj_basico = est.cnpj_basico
      where est.cnpj_basico <> $1
        and est.endereco_normalizado = any($2::text[])
      limit 20
    `,
    [cnpjBasico, addresses],
  );

  return rows.map((row) => ({
    type: "same_address",
    score: 25,
    reason: "Empresa encontrada no mesmo endereço normalizado.",
    company: mapEmpresaRow(row),
  }));
}

async function findSameContactRelations(
  cnpjBasico: string,
  estabelecimentos: Estabelecimento[],
  kind: "phone" | "email",
): Promise<Relation[]> {
  const values = estabelecimentos
    .map((item) => (kind === "phone" ? item.telefone : item.email))
    .filter(Boolean);
  if (values.length === 0) return [];

  const column = kind === "phone" ? "telefone1_normalizado" : "email_normalizado";
  const score = kind === "phone" ? 30 : 30;
  const type = kind === "phone" ? "same_phone" : "same_email";
  const label = kind === "phone" ? "telefone" : "e-mail";

  const { rows } = await receitaPool.query(
    `
      select distinct emp.cnpj_basico, emp.razao_social, emp.natureza_juridica, emp.qualificacao_responsavel,
             emp.capital_social::text, emp.porte, est.${column} as evidence
      from receita_estabelecimentos est
      join receita_empresas emp on emp.cnpj_basico = est.cnpj_basico
      where est.cnpj_basico <> $1
        and est.${column} = any($2::text[])
      limit 20
    `,
    [cnpjBasico, values],
  );

  return rows.map((row) => ({
    type,
    score,
    reason: `Mesmo ${label}: ${row.evidence}.`,
    company: mapEmpresaRow(row),
  }));
}

function limitRelations(relations: Relation[]): Relation[] {
  const seen = new Set<string>();
  return relations
    .filter((item) => {
      const key = `${item.type}-${item.company.cnpjBasico}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

function buildRiskHints(estabelecimentos: Estabelecimento[], socios: Socio[], relations: Relation[]): string[] {
  const hints: string[] = [];
  if (socios.length === 0) hints.push("Quadro societário não disponível na base local importada.");
  if (estabelecimentos.length === 0) hints.push("Estabelecimentos não encontrados na amostra importada.");
  if (relations.length === 0) hints.push("Nenhum vínculo local detectado com os dados importados até agora.");
  return hints;
}

function buildGraph(target: Empresa, estabelecimentos: Estabelecimento[], socios: Socio[], relations: Relation[]) {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const targetId = `company:${target.cnpjBasico}`;

  nodes.set(targetId, { id: targetId, type: "company", label: target.razaoSocial || target.cnpjBasico });

  for (const socio of socios.slice(0, 20)) {
    const id = `partner:${socio.documento || socio.nome}`;
    nodes.set(id, { id, type: "partner", label: socio.nome || "Sócio" });
    edges.push({ from: targetId, to: id, type: "partner", label: "sócio" });
  }

  for (const est of estabelecimentos.slice(0, 10)) {
    const address = est.enderecoNormalizado || [est.municipio, est.uf].filter(Boolean).join("/");
    if (!address) continue;
    const id = `address:${address}`;
    nodes.set(id, { id, type: "address", label: [est.municipio, est.uf].filter(Boolean).join(" / ") || "Endereço" });
    edges.push({ from: targetId, to: id, type: "address", label: "endereço" });
  }

  for (const relation of relations.slice(0, 20)) {
    const id = `company:${relation.company.cnpjBasico}`;
    nodes.set(id, { id, type: "company", label: relation.company.razaoSocial || relation.company.cnpjBasico });
    edges.push({ from: targetId, to: id, type: relation.type, label: relation.reason });
  }

  return { nodes: [...nodes.values()], edges };
}

function mapEmpresaRow(row: Record<string, unknown>): Empresa {
  return {
    cnpjBasico: String(row.cnpj_basico || ""),
    razaoSocial: typeof row.razao_social === "string" ? row.razao_social : null,
    naturezaJuridica: typeof row.natureza_juridica === "string" ? row.natureza_juridica : null,
    qualificacaoResponsavel:
      typeof row.qualificacao_responsavel === "string" ? row.qualificacao_responsavel : null,
    capitalSocial: row.capital_social === null || row.capital_social === undefined ? null : String(row.capital_social),
    porte: typeof row.porte === "string" ? row.porte : null,
  };
}

function stripInternalEstablishment(estabelecimento: Estabelecimento): Omit<Estabelecimento, "enderecoNormalizado"> {
  const { enderecoNormalizado: _enderecoNormalizado, ...publicData } = estabelecimento;
  return publicData;
}
