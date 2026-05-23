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
  municipio_nome: string | null;
  uf: string | null;
  telefone1_normalizado: string | null;
  email: string | null;
  endereco_normalizado: string | null;
};

export type ReceitaEstabelecimentoSampleRow = {
  cnpj_basico: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_fiscal_principal: string | null;
  municipio: string | null;
  municipio_nome: string | null;
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

export type ReceitaPartnerSearchRow = {
  nome_socio: string;
  total_empresas: number;
};

export type ReceitaContactSearchRow = {
  valor: string;
  total_empresas: number;
};

export async function searchReceitaByCnpjBasico(cnpjBasico: string): Promise<ReceitaEmpresaRow[]> {
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
      where e.cnpj_basico = $1
      limit 1
    `,
    [cnpjBasico],
  );

  return rows;
}

export async function searchReceitaByCnpjCompleto(cnpjCompleto: string): Promise<(ReceitaEmpresaRow & { cnpj_completo: string })[]> {
  const { rows } = await receitaPool.query<ReceitaEmpresaRow & { cnpj_completo: string }>(
    `
      select
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio,
        est.cnpj as cnpj_completo
      from receita_estabelecimentos est
      join receita_empresas e on e.cnpj_basico = est.cnpj_basico
      where est.cnpj = $1
      limit 1
    `,
    [cnpjCompleto],
  );

  return rows;
}

export async function searchReceitaPartners(q: string, limit: number): Promise<ReceitaPartnerSearchRow[]> {
  const termo = q.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaPartnerSearchRow>(
    `
      select
        s.nome_socio,
        count(distinct s.cnpj_basico)::int as total_empresas
      from receita_socios s
      where lower(s.nome_socio) like '%' || $1 || '%'
      group by s.nome_socio
      order by total_empresas desc, s.nome_socio asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaCompaniesByPartner(q: string, limit: number): Promise<(ReceitaEmpresaRow & { nome_socio: string })[]> {
  const termo = q.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaEmpresaRow & { nome_socio: string }>(
    `
      select distinct
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        exists(select 1 from receita_estabelecimentos est where est.cnpj_basico = e.cnpj_basico) as tem_estabelecimento,
        exists(select 1 from receita_socios s2 where s2.cnpj_basico = e.cnpj_basico) as tem_socio,
        s.nome_socio
      from receita_socios s
      join receita_empresas e on e.cnpj_basico = s.cnpj_basico
      where lower(s.nome_socio) like '%' || $1 || '%'
      order by e.razao_social asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaPhones(q: string, limit: number): Promise<ReceitaContactSearchRow[]> {
  const termo = q.replace(/\D/g, "");
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaContactSearchRow>(
    `
      select
        est.telefone1_normalizado as valor,
        count(distinct est.cnpj_basico)::int as total_empresas
      from receita_estabelecimentos est
      where coalesce(est.telefone1_normalizado, '') <> ''
        and est.telefone1_normalizado like '%' || $1 || '%'
      group by est.telefone1_normalizado
      order by total_empresas desc, est.telefone1_normalizado asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaCompaniesByPhone(phone: string, limit: number): Promise<ReceitaEmpresaRow[]> {
  const termo = phone.replace(/\D/g, "");
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select distinct
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio
      from receita_estabelecimentos est
      join receita_empresas e on e.cnpj_basico = est.cnpj_basico
      where est.telefone1_normalizado = $1
      order by e.razao_social asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaEmails(q: string, limit: number): Promise<ReceitaContactSearchRow[]> {
  const termo = q.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaContactSearchRow>(
    `
      select
        coalesce(est.email_normalizado, lower(est.email)) as valor,
        count(distinct est.cnpj_basico)::int as total_empresas
      from receita_estabelecimentos est
      where coalesce(est.email_normalizado, est.email, '') <> ''
        and coalesce(est.email_normalizado, lower(est.email)) like '%' || $1 || '%'
      group by coalesce(est.email_normalizado, lower(est.email))
      order by total_empresas desc, valor asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaCompaniesByEmail(email: string, limit: number): Promise<ReceitaEmpresaRow[]> {
  const termo = email.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select distinct
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio
      from receita_estabelecimentos est
      join receita_empresas e on e.cnpj_basico = est.cnpj_basico
      where coalesce(est.email_normalizado, lower(est.email)) = $1
      order by e.razao_social asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaAddresses(q: string, limit: number): Promise<ReceitaContactSearchRow[]> {
  const termo = q.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaContactSearchRow>(
    `
      select
        est.endereco_normalizado as valor,
        count(distinct est.cnpj_basico)::int as total_empresas
      from receita_estabelecimentos est
      where coalesce(est.endereco_normalizado, '') <> ''
        and lower(est.endereco_normalizado) like '%' || $1 || '%'
      group by est.endereco_normalizado
      order by total_empresas desc, est.endereco_normalizado asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function searchReceitaCompaniesByCep(cep: string, limit: number): Promise<ReceitaEmpresaRow[]> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return [];

  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select distinct
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio
      from receita_estabelecimentos est
      join receita_empresas e on e.cnpj_basico = est.cnpj_basico
      where regexp_replace(coalesce(est.cep, ''), '\\D', '', 'g') = $1
      order by e.razao_social asc
      limit $2
    `,
    [digits, limit],
  );

  return rows;
}

export async function searchReceitaMunicipios(q: string, limit: number): Promise<Array<{ codigo: string; nome: string }>> {
  const termo = q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  if (!termo && !digits) return [];

  const { rows } = await receitaPool.query<{ codigo: string; nome: string }>(
    `
      select codigo, nome
      from receita_municipios
      where ($1 <> '' and codigo = $1)
         or ($2 <> '' and lower(nome) like '%' || $2 || '%')
      order by nome asc
      limit $3
    `,
    [digits.length >= 4 ? digits : "", termo, limit],
  );

  return rows;
}

export async function searchReceitaCompaniesByMunicipio(q: string, limit: number): Promise<ReceitaEmpresaRow[]> {
  const municipios = await searchReceitaMunicipios(q, 3);
  if (municipios.length === 0) return [];

  const codigos = municipios.map((item) => item.codigo);
  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select distinct
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio
      from receita_estabelecimentos est
      join receita_empresas e on e.cnpj_basico = est.cnpj_basico
      where est.municipio = any($1::text[])
      order by e.razao_social asc
      limit $2
    `,
    [codigos, limit],
  );

  return rows;
}

export async function searchReceitaCompaniesByAddress(address: string, limit: number): Promise<ReceitaEmpresaRow[]> {
  const termo = address.trim().toLowerCase();
  if (!termo) return [];

  const { rows } = await receitaPool.query<ReceitaEmpresaRow>(
    `
      select distinct
        e.cnpj_basico,
        e.razao_social,
        e.natureza_juridica,
        e.qualificacao_responsavel,
        e.capital_social::text,
        e.porte,
        true as tem_estabelecimento,
        exists(select 1 from receita_socios s where s.cnpj_basico = e.cnpj_basico) as tem_socio
      from receita_estabelecimentos est
      join receita_empresas e on e.cnpj_basico = est.cnpj_basico
      where lower(est.endereco_normalizado) = $1
      order by e.razao_social asc
      limit $2
    `,
    [termo, limit],
  );

  return rows;
}

export async function findFirstReceitaEstabelecimentoByCnpjBasico(cnpjBasico: string): Promise<string | null> {
  const { rows } = await receitaPool.query<{ cnpj: string }>(
    `
      select cnpj
      from receita_estabelecimentos
      where cnpj_basico = $1
      order by cnpj_ordem asc
      limit 1
    `,
    [cnpjBasico],
  );

  return rows[0]?.cnpj ?? null;
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
        e.cnpj,
        e.nome_fantasia,
        e.situacao_cadastral,
        e.cnae_fiscal_principal,
        e.municipio,
        m.nome as municipio_nome,
        e.uf,
        e.telefone1_normalizado,
        e.email,
        e.endereco_normalizado
      from receita_estabelecimentos e
      left join receita_municipios m on m.codigo = e.municipio
      where e.cnpj_basico = $1
      order by e.cnpj_ordem asc
      limit $2
    `,
    [cnpjBasico, limit],
  );

  return rows;
}

export type ReceitaSocioRow = {
  nome_socio: string | null;
  cnpj_cpf_socio: string | null;
  qualificacao_socio: string | null;
};

export async function listReceitaSociosByCnpjBasico(
  cnpjBasico: string,
  limit = 50,
): Promise<ReceitaSocioRow[]> {
  const { rows } = await receitaPool.query<ReceitaSocioRow>(
    `
      select nome_socio, cnpj_cpf_socio, qualificacao_socio
      from receita_socios
      where cnpj_basico = $1
      order by nome_socio asc
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
        m.nome as municipio_nome,
        e.uf
      from receita_estabelecimentos e
      join receita_empresas emp on emp.cnpj_basico = e.cnpj_basico
      left join receita_municipios m on m.codigo = e.municipio
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
