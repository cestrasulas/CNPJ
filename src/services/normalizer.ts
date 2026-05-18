// path: src/services/normalizer.ts
import type { JsonObject, NormalizedCompany, ProviderResult } from "../types/cnpj";
import { formatarCep, formatarCnpj, formatarData, formatarMoeda } from "../utils/formatters";

export function normalizarEmpresa(result: ProviderResult): NormalizedCompany {
  if (result.provider === "backend") return normalizarBackend(result.raw);
  if (result.provider === "cnpjws") return normalizarCnpjWs(result.raw);
  if (result.provider === "cnpja") return normalizarCnpja(result.raw);
  return normalizarBrasilApi(result.raw);
}

function normalizarBackend(raw: JsonObject): NormalizedCompany {
  const data = getObject(raw, "data");
  const meta = getObject(raw, "meta");
  const providerRaw = getObject(raw, "raw");
  const rawCompany = getObject(providerRaw, "company");
  const address = getObject(data, "address");
  const emails = listarContatosBackend(data, "email");
  const telefones = listarContatosBackend(data, "phone");
  const socios = listarSociosBackend(data);

  return {
    provider: montarProviderBackend(meta),
    cnpj: formatarCnpj(texto(data, "cnpj")),
    razaoSocial: texto(data, "legalName"),
    nomeFantasia: texto(data, "tradeName"),
    situacao: texto(data, "status") || texto(getObject(providerRaw, "status"), "text"),
    tipo: "",
    abertura: formatarData(texto(data, "openingDate")),
    capitalSocial: formatarMoeda(texto(data, "capital")),
    porte: texto(data, "size") || texto(getObject(rawCompany, "size"), "text"),
    naturezaJuridica: texto(data, "legalNature") || texto(getObject(rawCompany, "nature"), "text"),
    email: emails[0] ?? "",
    emails,
    telefone: telefones[0] ?? "",
    telefones,
    endereco: montarEnderecoBackend(address),
    cidade: texto(address, "city"),
    uf: texto(address, "state"),
    cnaePrincipal: montarCnaeBackend(data),
    inscricoesEstaduais: "",
    inscricoesEstaduaisExtras: [],
    socios: socios.length ? socios : listarSociosCnpja(providerRaw),
    simplesNacional:
      opcaoTributaria(getObject(providerRaw, "simples"), "optant") ||
      opcaoTributaria(getObject(rawCompany, "simples"), "optant"),
    mei: opcaoTributaria(getObject(providerRaw, "simei"), "optant") || opcaoTributaria(getObject(rawCompany, "simei"), "optant"),
    raw,
  };
}

function normalizarCnpjWs(raw: JsonObject): NormalizedCompany {
  const estabelecimento = getObject(raw, "estabelecimento");
  const cidade = getObject(estabelecimento, "cidade");
  const estado = getObject(estabelecimento, "estado");
  const atividadePrincipal = getObject(estabelecimento, "atividade_principal");
  const porte = getObject(raw, "porte");
  const natureza = getObject(raw, "natureza_juridica");

  return {
    provider: "CNPJ.ws",
    cnpj: formatarCnpj(texto(estabelecimento, "cnpj")),
    razaoSocial: texto(raw, "razao_social"),
    nomeFantasia: texto(estabelecimento, "nome_fantasia"),
    situacao: texto(estabelecimento, "situacao_cadastral"),
    tipo: texto(estabelecimento, "tipo"),
    abertura: formatarData(texto(estabelecimento, "data_inicio_atividade")),
    capitalSocial: formatarMoeda(texto(raw, "capital_social")),
    porte: texto(porte, "descricao"),
    naturezaJuridica: texto(natureza, "descricao"),
    email: texto(estabelecimento, "email"),
    emails: listaUnica([texto(estabelecimento, "email")]),
    telefone: montarTelefoneCnpjWs(estabelecimento),
    telefones: montarTelefonesCnpjWs(estabelecimento),
    endereco: montarEnderecoCnpjWs(estabelecimento),
    cidade: texto(cidade, "nome"),
    uf: texto(estado, "sigla"),
    cnaePrincipal: montarCnae(atividadePrincipal),
    inscricoesEstaduais: montarInscricoesCnpjWs(estabelecimento),
    inscricoesEstaduaisExtras: listarInscricoesCnpjWs(estabelecimento),
    socios: listarSociosCnpjWs(raw),
    simplesNacional: opcaoTributaria(getObject(raw, "simples"), "simples"),
    mei: opcaoTributaria(getObject(raw, "simples"), "mei"),
    raw,
  };
}

function normalizarCnpja(raw: JsonObject): NormalizedCompany {
  const company = getObject(raw, "company");
  const address = getObject(raw, "address");
  const city = getObject(address, "city");
  const state = getObject(address, "state");
  const mainActivity = getObject(raw, "mainActivity");
  const status = getObject(raw, "status");
  const size = getObject(company, "size");
  const nature = getObject(company, "nature");

  return {
    provider: "CNPJá Pública",
    cnpj: formatarCnpj(texto(raw, "taxId")),
    razaoSocial: texto(company, "name"),
    nomeFantasia: texto(raw, "alias"),
    situacao: texto(status, "text"),
    tipo: texto(raw, "type"),
    abertura: formatarData(texto(raw, "founded")),
    capitalSocial: formatarMoeda(texto(company, "equity")),
    porte: texto(size, "text"),
    naturezaJuridica: texto(nature, "text"),
    email: texto(raw, "email"),
    emails: listaUnica([texto(raw, "email")]),
    telefone: montarTelefoneCnpja(raw),
    telefones: montarTelefonesCnpja(raw),
    endereco: montarEnderecoCnpja(address),
    cidade: texto(city, "name"),
    uf: texto(state, "acronym"),
    cnaePrincipal: montarCnaeCnpja(mainActivity),
    inscricoesEstaduais: montarInscricoesCnpja(raw),
    inscricoesEstaduaisExtras: listarInscricoesCnpja(raw),
    socios: listarSociosCnpja(raw),
    simplesNacional: opcaoTributaria(getObject(raw, "simples"), "optant"),
    mei: opcaoTributaria(getObject(raw, "simei"), "optant"),
    raw,
  };
}

function normalizarBrasilApi(raw: JsonObject): NormalizedCompany {
  return {
    provider: "BrasilAPI",
    cnpj: formatarCnpj(texto(raw, "cnpj")),
    razaoSocial: texto(raw, "razao_social"),
    nomeFantasia: texto(raw, "nome_fantasia"),
    situacao: texto(raw, "descricao_situacao_cadastral") || texto(raw, "situacao_cadastral"),
    tipo: texto(raw, "descricao_identificador_matriz_filial"),
    abertura: formatarData(texto(raw, "data_inicio_atividade")),
    capitalSocial: formatarMoeda(texto(raw, "capital_social")),
    porte: texto(raw, "porte"),
    naturezaJuridica: texto(raw, "natureza_juridica"),
    email: texto(raw, "email"),
    emails: listaUnica([texto(raw, "email")]),
    telefone: montarTelefoneBrasilApi(raw),
    telefones: montarTelefonesBrasilApi(raw),
    endereco: montarEnderecoBrasilApi(raw),
    cidade: texto(raw, "municipio"),
    uf: texto(raw, "uf"),
    cnaePrincipal: montarCnaeBrasilApi(raw),
    inscricoesEstaduais: "",
    inscricoesEstaduaisExtras: [],
    socios: listarSociosBrasilApi(raw),
    simplesNacional: opcaoTexto(raw, "opcao_pelo_simples"),
    mei: opcaoTexto(raw, "opcao_pelo_mei"),
    raw,
  };
}

function montarTelefoneCnpjWs(estabelecimento: JsonObject): string {
  const ddd = texto(estabelecimento, "ddd1");
  const telefone = texto(estabelecimento, "telefone1");
  return telefone ? (ddd ? `(${ddd}) ${telefone}` : telefone) : "";
}

function montarTelefonesCnpjWs(estabelecimento: JsonObject): string[] {
  return listaUnica([
    montarTelefoneComDdd(texto(estabelecimento, "ddd1"), texto(estabelecimento, "telefone1")),
    montarTelefoneComDdd(texto(estabelecimento, "ddd2"), texto(estabelecimento, "telefone2")),
    texto(estabelecimento, "fax"),
  ]);
}

function montarTelefoneCnpja(raw: JsonObject): string {
  const phones = raw["phones"];
  if (!Array.isArray(phones) || phones.length === 0) return "";

  const first = phones[0];
  if (!isObject(first)) return "";

  const area = texto(first, "area");
  const number = texto(first, "number");

  return area && number ? `(${area}) ${number}` : number;
}

function montarTelefonesCnpja(raw: JsonObject): string[] {
  const phones = raw["phones"];
  if (!Array.isArray(phones)) return [];

  return listaUnica(
    phones.filter(isObject).map((phone) => {
      return montarTelefoneComDdd(texto(phone, "area"), texto(phone, "number"));
    }),
  );
}

function montarTelefoneBrasilApi(raw: JsonObject): string {
  const ddd = texto(raw, "ddd_telefone_1");
  const telefone = texto(raw, "telefone_1");

  if (telefone) return ddd ? `(${ddd}) ${telefone}` : telefone;

  const telefoneCompleto = texto(raw, "telefone");
  return telefoneCompleto;
}

function montarTelefonesBrasilApi(raw: JsonObject): string[] {
  return listaUnica([
    montarTelefoneComDdd(texto(raw, "ddd_telefone_1"), texto(raw, "telefone_1")),
    montarTelefoneComDdd(texto(raw, "ddd_telefone_2"), texto(raw, "telefone_2")),
    texto(raw, "telefone"),
  ]);
}

function montarTelefoneComDdd(ddd: string, telefone: string): string {
  if (!telefone) return "";
  return ddd ? `(${ddd}) ${telefone}` : telefone;
}

function montarProviderBackend(meta: JsonObject): string {
  const source = texto(meta, "source");
  const cache = texto(meta, "cache");
  return ["Backend", source, cache ? `cache ${cache}` : ""].filter(Boolean).join(" · ");
}

function montarEnderecoBackend(address: JsonObject): string {
  const partes = [
    texto(address, "street"),
    texto(address, "number") ? `nº ${texto(address, "number")}` : "",
    texto(address, "complement"),
    texto(address, "district"),
    formatarCep(texto(address, "zipCode")),
  ].filter(Boolean);

  return partes.join(", ");
}

function montarCnaeBackend(data: JsonObject): string {
  const codigo = texto(data, "mainCnae");
  const descricao = texto(data, "mainCnaeDescription");
  if (codigo || descricao) return [codigo, descricao].filter(Boolean).join(" — ");

  const cnaes = data["cnaes"];
  if (!Array.isArray(cnaes)) return "";

  const principal = cnaes.find((item) => isObject(item) && item["isPrimary"] === true);
  if (!isObject(principal)) return "";

  return [texto(principal, "code"), texto(principal, "description")].filter(Boolean).join(" — ");
}

function listarContatosBackend(data: JsonObject, tipo: "email" | "phone"): string[] {
  const contacts = data["contacts"];
  if (!Array.isArray(contacts)) return [];

  return listaUnica(
    contacts
      .filter(isObject)
      .filter((contact) => texto(contact, "type") === tipo)
      .map((contact) => texto(contact, "value")),
  );
}

function listarSociosBackend(data: JsonObject): string[] {
  const partners = data["partners"];
  if (!Array.isArray(partners)) return [];

  return listaUnica(
    partners.filter(isObject).map((partner) => {
      return formatarSocio(texto(partner, "name"), texto(partner, "qualification") || texto(partner, "role"));
    }),
  );
}

function montarEnderecoCnpjWs(estabelecimento: JsonObject): string {
  const partes = [
    texto(estabelecimento, "tipo_logradouro"),
    texto(estabelecimento, "logradouro"),
    texto(estabelecimento, "numero") ? `nº ${texto(estabelecimento, "numero")}` : "",
    texto(estabelecimento, "complemento"),
    texto(estabelecimento, "bairro"),
    formatarCep(texto(estabelecimento, "cep")),
  ].filter(Boolean);

  return partes.join(", ");
}

function montarEnderecoCnpja(address: JsonObject): string {
  const partes = [
    texto(address, "street"),
    texto(address, "number") ? `nº ${texto(address, "number")}` : "",
    texto(address, "details"),
    texto(address, "district"),
    formatarCep(texto(address, "zip")),
  ].filter(Boolean);

  return partes.join(", ");
}

function montarEnderecoBrasilApi(raw: JsonObject): string {
  const partes = [
    texto(raw, "descricao_tipo_de_logradouro"),
    texto(raw, "logradouro"),
    texto(raw, "numero") ? `nº ${texto(raw, "numero")}` : "",
    texto(raw, "complemento"),
    texto(raw, "bairro"),
    formatarCep(texto(raw, "cep")),
  ].filter(Boolean);

  return partes.join(", ");
}

function montarCnae(atividade: JsonObject): string {
  const id = texto(atividade, "id");
  const descricao = texto(atividade, "descricao");
  return [id, descricao].filter(Boolean).join(" — ");
}

function montarCnaeCnpja(activity: JsonObject): string {
  const id = texto(activity, "id");
  const text = texto(activity, "text");
  return [id, text].filter(Boolean).join(" — ");
}

function montarCnaeBrasilApi(raw: JsonObject): string {
  const codigo = texto(raw, "cnae_fiscal");
  const descricao = texto(raw, "cnae_fiscal_descricao");
  return [codigo, descricao].filter(Boolean).join(" — ");
}

function montarInscricoesCnpjWs(estabelecimento: JsonObject): string {
  const lista = estabelecimento["inscricoes_estaduais"];
  if (!Array.isArray(lista) || lista.length === 0) return "";
  return listarInscricoesCnpjWs(estabelecimento).join(" | ");
}

function listarInscricoesCnpjWs(estabelecimento: JsonObject): string[] {
  const lista = estabelecimento["inscricoes_estaduais"];
  if (!Array.isArray(lista) || lista.length === 0) return [];
  return lista
    .filter((ie): ie is JsonObject => isObject(ie))
    .map((ie) => {
      const estado = getObject(ie, "estado");
      const sigla = texto(estado, "sigla");
      const numero = texto(ie, "inscricao_estadual");
      const sufixo = ie["ativo"] === false ? " (inativa)" : "";
      return [sigla, numero].filter(Boolean).join(": ") + sufixo;
    })
    .filter(Boolean);
}

function montarInscricoesCnpja(raw: JsonObject): string {
  const lista = raw["registrations"];
  if (!Array.isArray(lista) || lista.length === 0) return "";
  return listarInscricoesCnpja(raw).join(" | ");
}

function listarInscricoesCnpja(raw: JsonObject): string[] {
  const lista = raw["registrations"];
  if (!Array.isArray(lista) || lista.length === 0) return [];
  return lista
    .filter((r): r is JsonObject => isObject(r))
    .map((r) => {
      const state = getObject(r, "state");
      const sigla = texto(state, "acronym");
      const numero = texto(r, "number");
      const sufixo = r["enabled"] === false ? " (inativa)" : "";
      return [sigla, numero].filter(Boolean).join(": ") + sufixo;
    })
    .filter(Boolean);
}

function listarSociosCnpjWs(raw: JsonObject): string[] {
  const socios = raw["socios"];
  if (!Array.isArray(socios)) return [];

  return listaUnica(
    socios.filter(isObject).map((socio) => {
      const qualificacao = getObject(socio, "qualificacao_socio");
      return formatarSocio(texto(socio, "nome"), texto(qualificacao, "descricao"));
    }),
  );
}

function listarSociosCnpja(raw: JsonObject): string[] {
  const members = getObject(raw, "company")["members"];
  if (!Array.isArray(members)) return [];

  return listaUnica(
    members.filter(isObject).map((member) => {
      const person = getObject(member, "person");
      const role = getObject(member, "role");
      return formatarSocio(texto(person, "name") || texto(member, "name"), texto(role, "text"));
    }),
  );
}

function listarSociosBrasilApi(raw: JsonObject): string[] {
  const qsa = raw["qsa"];
  if (!Array.isArray(qsa)) return [];

  return listaUnica(
    qsa.filter(isObject).map((socio) => {
      return formatarSocio(texto(socio, "nome_socio") || texto(socio, "nome"), texto(socio, "qualificacao_socio"));
    }),
  );
}

function formatarSocio(nome: string, qualificacao: string): string {
  return [nome, qualificacao].filter(Boolean).join(" — ");
}

function opcaoTributaria(objeto: JsonObject, chave: string): string {
  if (!Object.prototype.hasOwnProperty.call(objeto, chave)) return "";
  return opcaoValor(objeto[chave]);
}

function opcaoTexto(objeto: JsonObject, chave: string): string {
  if (!Object.prototype.hasOwnProperty.call(objeto, chave)) return "";
  return opcaoValor(objeto[chave]);
}

function opcaoValor(valor: unknown): string {
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "string") {
    const normalizado = valor.trim().toLowerCase();
    if (!normalizado) return "";
    if (["sim", "s", "true", "1"].includes(normalizado)) return "Sim";
    if (["nao", "não", "n", "false", "0"].includes(normalizado)) return "Não";
    return valor.trim();
  }
  if (typeof valor === "number") return valor ? "Sim" : "Não";
  return "";
}

function listaUnica(valores: string[]): string[] {
  return [...new Set(valores.map((valor) => valor.trim()).filter(Boolean))];
}

function getObject(objeto: unknown, chave: string): JsonObject {
  if (!isObject(objeto)) return {};
  const valor = objeto[chave];
  return isObject(valor) ? valor : {};
}

function isObject(valor: unknown): valor is JsonObject {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(objeto: unknown, chave: string): string {
  if (!isObject(objeto)) return "";

  const valor = objeto[chave];

  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";

  return "";
}
// EOF