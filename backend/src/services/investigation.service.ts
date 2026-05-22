import { receitaPool } from "../lib/receitaDb.js";

type Empresa = {
  cnpjBasico: string;
  razaoSocial: string | null;
  naturezaJuridica: string | null;
  qualificacaoResponsavel: string | null;
  capitalSocial: string | null;
  porte: string | null;
  situacaoCadastral?: string | null;
};

type Estabelecimento = {
  cnpjCompleto: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  cnaePrincipal: string | null;
  municipio: string | null;
  municipioNome: string | null;
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

type FindingType =
  | "partner_network"
  | "shared_phone"
  | "shared_email"
  | "shared_address"
  | "branch_network"
  | "inactive_related"
  | "high_capital"
  | "data_gap";

type FindingSeverity = "LOW" | "MEDIUM" | "HIGH";

type Finding = {
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: string[];
};

type InvestigationScore = {
  level: FindingSeverity;
  points: number;
  reasons: string[];
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

export async function getInvestigationAvailability(cnpjBasico: string) {
  const { rows } = await receitaPool.query(
    `
      select
        exists(
          select 1 from receita_socios
          where cnpj_basico = $1
        ) as has_partners,
        exists(
          select 1 from receita_estabelecimentos
          where cnpj_basico = $1
            and coalesce(telefone1_normalizado, telefone2_normalizado, '') <> ''
        ) as has_phone,
        exists(
          select 1 from receita_estabelecimentos
          where cnpj_basico = $1
            and coalesce(email_normalizado, email, '') <> ''
        ) as has_email,
        exists(
          select 1 from receita_estabelecimentos
          where cnpj_basico = $1
            and coalesce(endereco_normalizado, '') <> ''
        ) as has_address
    `,
    [cnpjBasico],
  );

  const row = rows[0] ?? {};
  const hasPartners = Boolean(row.has_partners);
  const hasPhone = Boolean(row.has_phone);
  const hasEmail = Boolean(row.has_email);
  const hasAddress = Boolean(row.has_address);

  return {
    cnpjBasico,
    hasPartners,
    hasPhone,
    hasEmail,
    hasAddress,
    canInvestigate: hasPartners || hasPhone || hasEmail || hasAddress,
  };
}

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

  const totalRelatedByPartner = relations.filter((r) => r.type === "same_partner").length;
  const totalRelatedByAddress = relations.filter((r) => r.type === "same_address").length;
  const totalPhoneLinks = relations.filter((r) => r.type === "same_phone").length;
  const totalEmailLinks = relations.filter((r) => r.type === "same_email").length;
  const totalRelatedCompanies = relations.length;
  const totalVinculos = totalRelatedCompanies;

  const investigationLevel: "LOW" | "MEDIUM" | "HIGH" =
    totalVinculos > 10 ? "HIGH" : totalVinculos >= 4 ? "MEDIUM" : "LOW";
  const findings = buildFindings(target, socios, estabelecimentos, relations);
  const investigationScore = buildInvestigationScore(findings);

  return {
    target: {
      company: target,
      establishments: estabelecimentos.map(stripInternalEstablishment),
      partners: socios,
    },
    summary: {
      investigationLevel: investigationScore.level || investigationLevel,
      keyFindings: buildKeyFindings(target, socios, relations, estabelecimentos),
      totalPartners: socios.length,
      totalRelatedCompanies,
      totalRelatedByPartner,
      totalRelatedByAddress,
      totalPhoneLinks,
      totalEmailLinks,
      totalBranches: estabelecimentos.length,
      riskHints: buildRiskHints(estabelecimentos, socios, relations),
    },
    findings,
    investigationScore,
    relations,
    graph: buildGraph(target, estabelecimentos, socios, relations),
  };
}

async function findEmpresa(cnpjBasico: string): Promise<Empresa> {
  const { rows } = await receitaPool.query(
    `
      select e.cnpj_basico, e.razao_social, e.natureza_juridica, e.qualificacao_responsavel,
             e.capital_social::text, e.porte, est.situacao_cadastral
      from receita_empresas e
      left join lateral (
        select situacao_cadastral
        from receita_estabelecimentos
        where cnpj_basico = e.cnpj_basico
        order by cnpj_ordem asc
        limit 1
      ) est on true
      where e.cnpj_basico = $1
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
    situacaoCadastral: row?.situacao_cadastral ?? null,
  };
}

async function listEstabelecimentos(cnpjBasico: string): Promise<Estabelecimento[]> {
  const { rows } = await receitaPool.query(
    `
      select e.cnpj, e.nome_fantasia, e.situacao_cadastral, e.cnae_fiscal_principal,
             e.municipio, m.nome as municipio_nome, e.uf,
             e.telefone1_normalizado, e.email, e.endereco_normalizado
      from receita_estabelecimentos e
      left join receita_municipios m on m.codigo = e.municipio
      where e.cnpj_basico = $1
      order by e.cnpj_ordem asc
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
    municipioNome: row.municipio_nome ?? null,
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
             e.capital_social::text, e.porte, est.situacao_cadastral, s.nome_socio
      from receita_socios s
      join receita_empresas e on e.cnpj_basico = s.cnpj_basico
      left join lateral (
        select situacao_cadastral
        from receita_estabelecimentos
        where cnpj_basico = e.cnpj_basico
        order by cnpj_ordem asc
        limit 1
      ) est on true
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
             emp.capital_social::text, emp.porte, est.situacao_cadastral, est.endereco_normalizado
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
             emp.capital_social::text, emp.porte, est.situacao_cadastral, est.${column} as evidence
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

function buildKeyFindings(
  target: Empresa,
  socios: Socio[],
  relations: Relation[],
  estabelecimentos: Estabelecimento[],
): string[] {
  const findings: string[] = [];

  if (socios.length > 0) {
    const nomes = socios
      .slice(0, 2)
      .map((s) => s.nome)
      .filter(Boolean)
      .join(", ");
    findings.push(`${socios.length} sócio(s) identificado(s)${nomes ? `: ${nomes}` : ""}.`);
  }

  const partnerLinks = relations.filter((r) => r.type === "same_partner");
  if (partnerLinks.length > 0) {
    const exemplos = [...new Set(partnerLinks.map((r) => r.reason.replace("Sócio em comum: ", "").replace(".", "")))]
      .slice(0, 2)
      .join(", ");
    findings.push(`${partnerLinks.length} empresa(s) compartilham sócio em comum${exemplos ? ` (${exemplos})` : ""}.`);
  }

  const phoneLinks = relations.filter((r) => r.type === "same_phone");
  if (phoneLinks.length > 0) {
    findings.push(`${phoneLinks.length} empresa(s) com mesmo telefone de contato.`);
  }

  const emailLinks = relations.filter((r) => r.type === "same_email");
  if (emailLinks.length > 0) {
    findings.push(`${emailLinks.length} empresa(s) com mesmo e-mail de contato.`);
  }

  const addressLinks = relations.filter((r) => r.type === "same_address");
  if (addressLinks.length > 0) {
    findings.push(`${addressLinks.length} empresa(s) no mesmo endereço.`);
  }

  if (estabelecimentos.length > 1) {
    findings.push(`${estabelecimentos.length} estabelecimentos (matriz/filiais) identificados.`);
  }

  if (findings.length === 0) {
    findings.push("Nenhum vínculo identificado com os dados disponíveis na base local.");
  }

  return findings.slice(0, 5);
}

function buildRiskHints(estabelecimentos: Estabelecimento[], socios: Socio[], relations: Relation[]): string[] {
  const hints: string[] = [];
  if (socios.length === 0) hints.push("Quadro societário não disponível na base local importada.");
  if (estabelecimentos.length === 0) hints.push("Estabelecimentos não encontrados na amostra importada.");
  if (relations.length === 0) hints.push("Nenhum vínculo local detectado com os dados importados até agora.");
  return hints;
}

function buildFindings(
  target: Empresa,
  socios: Socio[],
  estabelecimentos: Estabelecimento[],
  relations: Relation[],
): Finding[] {
  const findings: Finding[] = [];
  const partnerRelations = relations.filter((relation) => relation.type === "same_partner");
  const phoneRelations = relations.filter((relation) => relation.type === "same_phone");
  const emailRelations = relations.filter((relation) => relation.type === "same_email");
  const addressRelations = relations.filter((relation) => relation.type === "same_address");
  const inactiveRelations = relations.filter((relation) => isInactiveCompany(relation.company));
  const capital = parseCapitalSocial(target.capitalSocial);

  if (partnerRelations.length > 0) {
    findings.push({
      type: "partner_network",
      severity: partnerRelations.length >= 5 ? "HIGH" : "MEDIUM",
      title: "Sócio conecta múltiplas empresas",
      description:
        "Foram encontradas empresas relacionadas por sócio em comum, um indício relevante para mapear grupo econômico ou atuação coordenada.",
      evidence: [
        `${partnerRelations.length} empresa(s) relacionada(s) por sócio.`,
        ...uniqueEvidence(partnerRelations.map((relation) => relation.reason)),
        ...socios.slice(0, 3).map((socio) => `Sócio da investigada: ${socio.nome || "não identificado"}`),
      ],
    });
  }

  if (phoneRelations.length > 0) {
    findings.push({
      type: "shared_phone",
      severity: phoneRelations.length >= 3 ? "HIGH" : "MEDIUM",
      title: "Telefone compartilhado entre empresas",
      description:
        "O mesmo telefone aparece em outra(s) empresa(s), o que pode indicar operação comum, escritório compartilhado ou vínculo operacional.",
      evidence: [`${phoneRelations.length} vínculo(s) por telefone.`, ...uniqueEvidence(phoneRelations.map((relation) => relation.reason))],
    });
  }

  if (emailRelations.length > 0) {
    findings.push({
      type: "shared_email",
      severity: emailRelations.length >= 3 ? "HIGH" : "MEDIUM",
      title: "E-mail compartilhado entre empresas",
      description:
        "O mesmo e-mail aparece em outra(s) empresa(s), sugerindo canal administrativo ou responsável comum.",
      evidence: [`${emailRelations.length} vínculo(s) por e-mail.`, ...uniqueEvidence(emailRelations.map((relation) => relation.reason))],
    });
  }

  if (addressRelations.length > 0) {
    findings.push({
      type: "shared_address",
      severity: addressRelations.length >= 5 ? "HIGH" : "MEDIUM",
      title: "Endereço compartilhado",
      description:
        "Há empresas no mesmo endereço normalizado, dado importante para identificar concentração empresarial, filial informal ou domicílio comum.",
      evidence: [
        `${addressRelations.length} empresa(s) encontrada(s) no mesmo endereço.`,
        ...uniqueEvidence(addressRelations.map((relation) => relation.company.razaoSocial || relation.company.cnpjBasico)),
      ],
    });
  }

  if (estabelecimentos.length > 1) {
    findings.push({
      type: "branch_network",
      severity: estabelecimentos.length >= 10 ? "HIGH" : "LOW",
      title: "Rede de matriz e filiais",
      description:
        "A empresa possui múltiplos estabelecimentos vinculados ao mesmo CNPJ básico, aumentando a superfície de investigação.",
      evidence: [
        `${estabelecimentos.length} estabelecimento(s) encontrado(s).`,
        ...estabelecimentos
          .slice(0, 5)
          .map((item) => `${item.cnpjCompleto} - ${[item.municipioNome || item.municipio, item.uf].filter(Boolean).join("/") || "local não informado"}`),
      ],
    });
  }

  if (inactiveRelations.length > 0) {
    findings.push({
      type: "inactive_related",
      severity: "HIGH",
      title: "Empresa relacionada baixada ou inativa",
      description:
        "Foram identificadas empresas relacionadas com situação cadastral diferente de ativa, o que pode exigir atenção adicional na análise.",
      evidence: inactiveRelations
        .slice(0, 5)
        .map((relation) => `${relation.company.razaoSocial || relation.company.cnpjBasico}: situação ${relation.company.situacaoCadastral}`),
    });
  }

  if (capital !== null && capital >= 1_000_000) {
    findings.push({
      type: "high_capital",
      severity: capital >= 10_000_000 ? "HIGH" : "MEDIUM",
      title: "Capital social elevado",
      description:
        "O capital social informado é alto e pode justificar análise mais cuidadosa de capacidade econômica, grupo relacionado e exposição.",
      evidence: [`Capital social: ${target.capitalSocial}.`],
    });
  }

  const gaps = buildDataGapEvidence(socios, estabelecimentos, relations);
  if (gaps.length > 0) {
    findings.push({
      type: "data_gap",
      severity: relations.length === 0 ? "MEDIUM" : "LOW",
      title: "Lacunas nos dados disponíveis",
      description:
        "A base local não contém todos os dados necessários para fechar a investigação com segurança; os achados devem ser lidos como parciais.",
      evidence: gaps,
    });
  }

  return findings;
}

function buildInvestigationScore(findings: Finding[]): InvestigationScore {
  const points = findings.reduce((total, finding) => {
    if (finding.severity === "HIGH") return total + 35;
    if (finding.severity === "MEDIUM") return total + 20;
    return total + 8;
  }, 0);
  const level: FindingSeverity = points >= 70 ? "HIGH" : points >= 30 ? "MEDIUM" : "LOW";
  const reasons = findings
    .filter((finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM")
    .map((finding) => finding.title)
    .slice(0, 5);

  return {
    level,
    points,
    reasons: reasons.length > 0 ? reasons : ["Poucos vínculos relevantes encontrados na base local."],
  };
}

function buildDataGapEvidence(socios: Socio[], estabelecimentos: Estabelecimento[], relations: Relation[]): string[] {
  const gaps: string[] = [];
  if (socios.length === 0) gaps.push("Quadro societário ausente na amostra local.");
  if (estabelecimentos.length === 0) gaps.push("Nenhum estabelecimento encontrado na amostra local.");
  if (estabelecimentos.length > 0 && !estabelecimentos.some((item) => item.telefone)) {
    gaps.push("Nenhum telefone disponível nos estabelecimentos encontrados.");
  }
  if (estabelecimentos.length > 0 && !estabelecimentos.some((item) => item.email)) {
    gaps.push("Nenhum e-mail disponível nos estabelecimentos encontrados.");
  }
  if (relations.length === 0) gaps.push("Nenhuma empresa relacionada detectada com os dados importados.");
  if (socios.length > 0 && !socios.some((socio) => socio.dataEntrada)) {
    gaps.push("Datas de entrada dos sócios não disponíveis.");
  }
  return gaps;
}

function uniqueEvidence(items: Array<string | null | undefined>, limit = 5): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item)))].slice(0, limit);
}

function parseCapitalSocial(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isInactiveCompany(company: Empresa): boolean {
  const status = company.situacaoCadastral?.trim();
  return Boolean(status && status !== "02" && status.toLowerCase() !== "ativa");
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
    nodes.set(id, { id, type: "address", label: [est.municipioNome || est.municipio, est.uf].filter(Boolean).join(" / ") || "Endereço" });
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
    situacaoCadastral: typeof row.situacao_cadastral === "string" ? row.situacao_cadastral : null,
  };
}

function stripInternalEstablishment(estabelecimento: Estabelecimento): Estabelecimento {
  return estabelecimento;
}
