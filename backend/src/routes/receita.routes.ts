import type { FastifyInstance } from "fastify";
import {
  findReceitaEmpresaByCnpjBasico,
  listInvestigaveis,
  listReceitaEstabelecimentosByCnpjBasico,
  sampleReceitaEstabelecimentos,
  searchReceitaEmpresas,
  type ReceitaEstabelecimentoSampleRow,
  type ReceitaEstabelecimentoRow,
  type ReceitaEmpresaRow,
} from "../repositories/receita.repository.js";

export async function receitaRoutes(app: FastifyInstance) {
  app.get("/api/receita/debug/establishments-sample", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = clampLimit(query.limit);

    try {
      const rows = await sampleReceitaEstabelecimentos(limit);
      return reply.send({
        data: rows.map(mapEstabelecimentoSample),
        meta: { limit, total: rows.length },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao consultar amostra de estabelecimentos",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/receita/search", async (request, reply) => {
    const query = request.query as { q?: string; limit?: string };
    const q = query.q?.trim() ?? "";
    const limit = clampLimit(query.limit);

    if (q.length < 2) {
      return reply.status(400).send({
        error: "Busca inválida",
        message: "Digite pelo menos 2 caracteres para buscar na base Receita.",
      });
    }

    try {
      const rows = await searchReceitaEmpresas(q, limit);
      return reply.send({
        data: rows.map(mapEmpresa),
        meta: { q, limit, total: rows.length },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao buscar na Receita",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/receita/investigaveis", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = clampLimit(query.limit);

    try {
      const rows = await listInvestigaveis(limit);
      return reply.send({
        data: rows.map(mapEmpresa),
        meta: { limit, total: rows.length },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao listar empresas investigáveis",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/receita/companies/:cnpjBasico", async (request, reply) => {
    const params = request.params as { cnpjBasico: string };
    const cnpjBasico = params.cnpjBasico.replace(/\D/g, "");

    if (cnpjBasico.length !== 8) {
      return reply.status(400).send({
        error: "CNPJ básico inválido",
        message: "Informe um CNPJ básico com 8 dígitos.",
      });
    }

    try {
      const row = await findReceitaEmpresaByCnpjBasico(cnpjBasico);
      if (!row) {
        return reply.status(404).send({
          error: "Empresa não encontrada",
          message: "Nenhuma empresa encontrada para este CNPJ básico.",
        });
      }

      return reply.send({ data: mapEmpresa(row) });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao consultar empresa Receita",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/receita/companies/:cnpjBasico/establishments", async (request, reply) => {
    const params = request.params as { cnpjBasico: string };
    const cnpjBasico = params.cnpjBasico.replace(/\D/g, "");

    if (cnpjBasico.length !== 8) {
      return reply.status(400).send({
        error: "CNPJ básico inválido",
        message: "Informe um CNPJ básico com 8 dígitos.",
      });
    }

    try {
      const rows = await listReceitaEstabelecimentosByCnpjBasico(cnpjBasico, 20);
      return reply.send({
        data: rows.map(mapEstabelecimento),
        meta: { cnpjBasico, limit: 20, total: rows.length },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao consultar estabelecimentos Receita",
        message: formatErrorMessage(error),
      });
    }
  });
}

function clampLimit(value?: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function computeStatusInvestigacao(temSocio: boolean | null | undefined, temEstabelecimento: boolean | null | undefined): "STRONG" | "PARTIAL" | "CADASTRAL" | null {
  if (temSocio == null && temEstabelecimento == null) return null;
  if (temSocio) return "STRONG";
  if (temEstabelecimento) return "PARTIAL";
  return "CADASTRAL";
}

function mapEmpresa(row: ReceitaEmpresaRow) {
  const temEstabelecimento = row.tem_estabelecimento ?? null;
  const temSocio = row.tem_socio ?? null;
  return {
    cnpjBasico: row.cnpj_basico,
    razaoSocial: row.razao_social,
    naturezaJuridica: row.natureza_juridica,
    qualificacaoResponsavel: row.qualificacao_responsavel,
    capitalSocial: row.capital_social,
    porte: row.porte,
    temEstabelecimento,
    temSocio,
    statusInvestigacao: computeStatusInvestigacao(temSocio, temEstabelecimento),
  };
}

function mapEstabelecimento(row: ReceitaEstabelecimentoRow) {
  return {
    cnpj: row.cnpj,
    nomeFantasia: row.nome_fantasia,
    situacaoCadastral: row.situacao_cadastral,
    cnaePrincipal: row.cnae_fiscal_principal,
    municipio: row.municipio,
    municipioNome: row.municipio_nome ?? null,
    uf: row.uf,
    telefone: row.telefone1_normalizado,
    email: row.email,
    enderecoNormalizado: row.endereco_normalizado,
  };
}

function mapEstabelecimentoSample(row: ReceitaEstabelecimentoSampleRow) {
  return {
    cnpjBasico: row.cnpj_basico,
    cnpjCompleto: row.cnpj,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnaePrincipal: row.cnae_fiscal_principal,
    municipio: row.municipio,
    municipioNome: row.municipio_nome ?? null,
    uf: row.uf,
  };
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map((item) => (item instanceof Error ? item.message : String(item))).join(" | ");
  }
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  return "Erro desconhecido";
}
