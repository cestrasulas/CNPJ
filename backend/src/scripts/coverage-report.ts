import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { receitaPool } from "../lib/receitaDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.resolve(__dirname, "../../reports/coverage-report.json");

type CoverageReport = {
  generatedAt: string;
  totals: {
    total_empresas: number;
    total_estabelecimentos: number;
    total_socios: number;
    cnpjs_empresa_estabelecimento: number;
    cnpjs_empresa_socios: number;
    cnpjs_completos: number;
  };
  investigation_status: {
    STRONG: number;
    PARTIAL: number;
    CADASTRAL: number;
    percent: {
      STRONG: number;
      PARTIAL: number;
      CADASTRAL: number;
    };
  };
  top_municipios: Array<{ municipio: string; uf: string | null; total: number }>;
  top_nomes_socios: Array<{ nome: string; total: number }>;
  top_telefones_compartilhados: Array<{ telefone: string; empresas_distintas: number }>;
};

async function main() {
  await receitaPool.query("SELECT 1");

  const totals = await queryTotals();
  const status = await queryInvestigationStatus(totals.total_empresas);
  const topMunicipios = await queryTopMunicipios();
  const topNomes = await queryTopNomesSocios();
  const topTelefones = await queryTopTelefones();

  const report: CoverageReport = {
    generatedAt: new Date().toISOString(),
    totals,
    investigation_status: status,
    top_municipios: topMunicipios,
    top_nomes_socios: topNomes,
    top_telefones_compartilhados: topTelefones,
  };

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  printSummary(report);
  console.log(`\nRelatório salvo em: ${REPORT_PATH}`);
}

async function queryTotals(): Promise<CoverageReport["totals"]> {
  const { rows } = await receitaPool.query<{
    total_empresas: string;
    total_estabelecimentos: string;
    total_socios: string;
    cnpjs_empresa_estabelecimento: string;
    cnpjs_empresa_socios: string;
    cnpjs_completos: string;
  }>(`
    select
      (select count(*)::bigint from receita_empresas) as total_empresas,
      (select count(*)::bigint from receita_estabelecimentos) as total_estabelecimentos,
      (select count(*)::bigint from receita_socios) as total_socios,
      (
        select count(distinct e.cnpj_basico)::bigint
        from receita_empresas e
        inner join receita_estabelecimentos est on est.cnpj_basico = e.cnpj_basico
      ) as cnpjs_empresa_estabelecimento,
      (
        select count(distinct e.cnpj_basico)::bigint
        from receita_empresas e
        inner join receita_socios s on s.cnpj_basico = e.cnpj_basico
      ) as cnpjs_empresa_socios,
      (
        select count(distinct e.cnpj_basico)::bigint
        from receita_empresas e
        where exists (select 1 from receita_estabelecimentos est where est.cnpj_basico = e.cnpj_basico)
          and exists (select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico)
      ) as cnpjs_completos
  `);

  const row = rows[0];
  return {
    total_empresas: Number(row.total_empresas),
    total_estabelecimentos: Number(row.total_estabelecimentos),
    total_socios: Number(row.total_socios),
    cnpjs_empresa_estabelecimento: Number(row.cnpjs_empresa_estabelecimento),
    cnpjs_empresa_socios: Number(row.cnpjs_empresa_socios),
    cnpjs_completos: Number(row.cnpjs_completos),
  };
}

async function queryInvestigationStatus(totalEmpresas: number): Promise<CoverageReport["investigation_status"]> {
  const { rows } = await receitaPool.query<{
    strong: string;
    partial: string;
    cadastral: string;
  }>(`
    with flags as (
      select
        e.cnpj_basico,
        exists (
          select 1 from receita_estabelecimentos est where est.cnpj_basico = e.cnpj_basico
        ) as tem_estabelecimento,
        exists (
          select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico
        ) as tem_socio
      from receita_empresas e
    )
    select
      count(*) filter (where tem_socio)::bigint as strong,
      count(*) filter (where not tem_socio and tem_estabelecimento)::bigint as partial,
      count(*) filter (where not tem_socio and not tem_estabelecimento)::bigint as cadastral
    from flags
  `);

  const row = rows[0];
  const STRONG = Number(row.strong);
  const PARTIAL = Number(row.partial);
  const CADASTRAL = Number(row.cadastral);
  const base = totalEmpresas > 0 ? totalEmpresas : 1;

  return {
    STRONG,
    PARTIAL,
    CADASTRAL,
    percent: {
      STRONG: roundPct((STRONG / base) * 100),
      PARTIAL: roundPct((PARTIAL / base) * 100),
      CADASTRAL: roundPct((CADASTRAL / base) * 100),
    },
  };
}

async function queryTopMunicipios(): Promise<CoverageReport["top_municipios"]> {
  const { rows } = await receitaPool.query<{ municipio: string; uf: string | null; total: string }>(`
    select municipio, uf, count(*)::bigint as total
    from receita_estabelecimentos
    where municipio is not null and municipio <> ''
    group by municipio, uf
    order by total desc
    limit 15
  `);

  return rows.map((row) => ({
    municipio: row.municipio,
    uf: row.uf,
    total: Number(row.total),
  }));
}

async function queryTopNomesSocios(): Promise<CoverageReport["top_nomes_socios"]> {
  const { rows } = await receitaPool.query<{ nome: string; total: string }>(`
    select coalesce(nome_socio_normalizado, nome_socio, '(sem nome)') as nome,
           count(*)::bigint as total
    from receita_socios
    group by 1
    order by total desc
    limit 15
  `);

  return rows.map((row) => ({
    nome: row.nome,
    total: Number(row.total),
  }));
}

async function queryTopTelefones(): Promise<CoverageReport["top_telefones_compartilhados"]> {
  const { rows } = await receitaPool.query<{ telefone: string; empresas_distintas: string }>(`
    select telefone, count(distinct cnpj_basico)::bigint as empresas_distintas
    from (
      select cnpj_basico, telefone1_normalizado as telefone
      from receita_estabelecimentos
      where telefone1_normalizado is not null and telefone1_normalizado <> ''
      union all
      select cnpj_basico, telefone2_normalizado as telefone
      from receita_estabelecimentos
      where telefone2_normalizado is not null and telefone2_normalizado <> ''
    ) t
    group by telefone
    having count(distinct cnpj_basico) > 1
    order by empresas_distintas desc
    limit 15
  `);

  return rows.map((row) => ({
    telefone: row.telefone,
    empresas_distintas: Number(row.empresas_distintas),
  }));
}

function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

function printSummary(report: CoverageReport): void {
  const { totals, investigation_status: status } = report;
  console.log("=== Cobertura Receita (Motor de Investigação) ===");
  console.log(`Empresas: ${totals.total_empresas.toLocaleString("pt-BR")}`);
  console.log(`Estabelecimentos: ${totals.total_estabelecimentos.toLocaleString("pt-BR")}`);
  console.log(`Sócios: ${totals.total_socios.toLocaleString("pt-BR")}`);
  console.log(`CNPJs empresa+estab: ${totals.cnpjs_empresa_estabelecimento.toLocaleString("pt-BR")}`);
  console.log(`CNPJs empresa+sócios: ${totals.cnpjs_empresa_socios.toLocaleString("pt-BR")}`);
  console.log(`CNPJs completos: ${totals.cnpjs_completos.toLocaleString("pt-BR")}`);
  console.log(
    `STRONG: ${status.STRONG.toLocaleString("pt-BR")} (${status.percent.STRONG}%) | ` +
      `PARTIAL: ${status.PARTIAL.toLocaleString("pt-BR")} (${status.percent.PARTIAL}%) | ` +
      `CADASTRAL: ${status.CADASTRAL.toLocaleString("pt-BR")} (${status.percent.CADASTRAL}%)`,
  );
}

main()
  .catch((error) => {
    console.error("Erro ao gerar coverage report:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await receitaPool.end();
  });
