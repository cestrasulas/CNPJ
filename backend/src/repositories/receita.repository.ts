import { receitaPool } from "../lib/receitaDb.js";

export type ReceitaEmpresaRow = {
  cnpj_basico: string;
  razao_social: string | null;
  natureza_juridica: string | null;
  qualificacao_responsavel: string | null;
  capital_social: string | null;
  porte: string | null;
  tem_estabelecimento?: boolean;
  tem_socio?: boolean;
};

export type ReceitaEstabelecimentoRow = {
  cnpj: string;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  cnae_fiscal_principal: string | null;
  municipio: string | null;
  uf: string | null;
  telefone1_normalizado: string | null;
  email: string | null;
};

export type ReceitaEstabelecimentoSampleRow = {
  cnpj_basico: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_fiscal_principal: string | null;
  municipio: string | null;
  uf: string | null;
};

export async function searchReceitaEmpresas(q: string, limit: number): Promise<ReceitaEmpresaRow[]> {
  const termo = q.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        exists(select 1 from receita_estabelecimentos est where est.cnpj_basico = e.cnpj_basico) as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio
      from receita_empresas e
      where e.razao_social_normalizada like '%' || $1 || '%'
      order by
        (exists(select 1 from receita_estabelecimentos est where est.cnpj_basico = e.cnpj_basico)
         and exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico)) desc,
        e.razao_social asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function listInvestigaveis(limit: number): Promise<ReceitaEmpresaRow[]> {
  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        true as tem_socio
      from receita_empresas e
      join receita_estabelecimentos est on est.cnpj_basico = e.cnpj_basico
      join receita_socios s on s.cnpj_basico = e.cnpj_basico
      group by e.cnpj_basico, e.razao_social, e.natureza_juridica,
               e.qualificacao_responsavel, e.capital_social, e.porte
      limit $1
    `,
    [limit],
  );

  return rows;
}

export async function findReceitaEmpresaByCnpjBasico(cnpjBasico: string): Promise<ReceitaEmpresaRow | null> {
  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select
        cnpj_basico,
        razao_social,
        natureza_juridica,
        qualificacao_responsavel,
        capital_social::text,
        porte
      from receita_empresas
      where cnpj_basico = $1
      limit 1
    `,
    [cnpjBasico],
  );

  return rows[0] ?? null;
}

export async function listReceitaEstabelecimentosByCnpjBasico(
  cnpjBasico: string,
  limit: number,
): Promise<ReceitaEstabelecimentoRow[]> {
  const { rows } = await receitaPool.query<ReceitaEstabelecimentoRow>(
    `
      select
        cnpj,
        nome_fantasia,
        situacao_cadastral,
        cnae_fiscal_principal,
        municipio,
        uf,
        telefone1_normalizado,
        email
      from receita_estabelecimentos
      where cnpj_basico = $1
      order by cnpj_ordem asc
      limit $2
    `,
    [cnpjBasico, limit],
  );

  return rows;
}

export async function sampleReceitaEstabelecimentos(limit: number): Promise<ReceitaEstabelecimentoSampleRow[]> {
  const { rows } = await receitaPool.query<ReceitaEstabelecimentoSampleRow>(
    `
      select
        e.cnpj_basico,
        e.cnpj,
        emp.razao_social,
        e.nome_fantasia,
        e.cnae_fiscal_principal,
        e.municipio,
        e.uf
      from receita_estabelecimentos e
      join receita_empresas emp on emp.cnpj_basico = e.cnpj_basico
      order by
        (exists (select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico)) desc,
        e.imported_at desc,
        e.cnpj asc
      limit $1
    `,
    [limit],
  );

  return rows;
}
