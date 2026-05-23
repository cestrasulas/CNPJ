// path: src/App.tsx
import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { JsonObject, JsonValue, NormalizedCompany, ProviderId } from "./types/cnpj";
import {
  CAMPOS_COMPARACAO,
  DADO_INDISPONIVEL_COMPARACAO,
  gerarCsvComparacao,
  gerarHtmlComparacao,
  valorComparacao,
} from "./services/compare";
import {
  obterDisponibilidadeInvestigacao,
  obterRelatorioInvestigacao,
  obterUrlDossieInvestigacao,
  type EvidenceClassification,
  type InvestigationAvailability,
  type InvestigationGraphEdge,
  type InvestigationGraphNode,
  type InvestigationRelation,
  type InvestigationReport,
} from "./services/investigation";
import { normalizarEmpresa } from "./services/normalizer";
import { consultarProvider } from "./services/providers";
import {
  buscarReceitaFederal,
  listarEstabelecimentosReceita,
  listarInvestigaveis,
  resolveStatusInvestigacao,
  type ReceitaEmpresa,
  type ReceitaEstabelecimento,
} from "./services/receita";
import {
  buscarInvestigativa,
  type InvestigationSearchResult,
  type InvestigationSearchType,
} from "./services/investigationSearch";
import {
  buscarLocal,
  calcularRelacionamentosLocais,
  type EmpresaRelacionadaLocal,
  montarIndiceBuscaLocal,
} from "./services/search";
import {
  formatarCep,
  formatarCnpj,
  formatarData,
  formatarMoeda,
  humanizar,
  mascararCnpj,
  somenteNumeros,
  validarCnpj,
} from "./utils/formatters";

const HISTORICO_KEY = "consulta-cnpj-historico-v2";
const FAVORITOS_KEY = "consulta-cnpj-favoritos-v1";
const DADO_INDISPONIVEL = "Dado não disponível neste provedor";

type HistoricoItem = {
  company: NormalizedCompany;
  raw: JsonObject;
};

export default function App() {
  const [provider, setProvider] = useState<ProviderId>("auto");
  const [cnpj, setCnpj] = useState("");
  const [company, setCompany] = useState<NormalizedCompany | null>(null);
  const [raw, setRaw] = useState<JsonObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarJson, setMostrarJson] = useState(false);
  const [expandirTudo, setExpandirTudo] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [buscaAvancada, setBuscaAvancada] = useState("");
  const [copiadoCampo, setCopiadoCampo] = useState("");
  const [buscaReceita, setBuscaReceita] = useState("");
  const [resultadosReceita, setResultadosReceita] = useState<ReceitaEmpresa[]>([]);
  const [loadingReceita, setLoadingReceita] = useState(false);
  const [erroReceita, setErroReceita] = useState("");
  const [receitaPesquisada, setReceitaPesquisada] = useState(false);
  const [empresaReceitaSelecionada, setEmpresaReceitaSelecionada] = useState<ReceitaEmpresa | null>(null);
  const [estabelecimentosReceita, setEstabelecimentosReceita] = useState<ReceitaEstabelecimento[]>([]);
  const [loadingEstabelecimentos, setLoadingEstabelecimentos] = useState(false);
  const [erroEstabelecimentos, setErroEstabelecimentos] = useState("");
  const [amostrasReceita, setAmostrasReceita] = useState<ReceitaEmpresa[]>([]);
  const [loadingAmostrasReceita, setLoadingAmostrasReceita] = useState(false);
  const [erroAmostrasReceita, setErroAmostrasReceita] = useState("");
  const [relatorioInvestigacao, setRelatorioInvestigacao] = useState<InvestigationReport | null>(null);
  const [profundidadeInvestigacao, setProfundidadeInvestigacao] = useState<1 | 2>(1);
  const [disponibilidadeInvestigacao, setDisponibilidadeInvestigacao] =
    useState<InvestigationAvailability | null>(null);
  const [loadingInvestigacao, setLoadingInvestigacao] = useState(false);
  const [erroInvestigacao, setErroInvestigacao] = useState("");
  const [buscaInvestigativa, setBuscaInvestigativa] = useState("");
  const [tipoBuscaInvestigativa, setTipoBuscaInvestigativa] = useState<InvestigationSearchType>("auto");
  const [resultadosInvestigativa, setResultadosInvestigativa] = useState<InvestigationSearchResult[]>([]);
  const [loadingBuscaInvestigativa, setLoadingBuscaInvestigativa] = useState(false);
  const [erroBuscaInvestigativa, setErroBuscaInvestigativa] = useState("");
  const [buscaInvestigativaPesquisada, setBuscaInvestigativaPesquisada] = useState(false);
  const [historico, setHistorico] = useState<HistoricoItem[]>(() => {
    try {
      const salvo = localStorage.getItem(HISTORICO_KEY);
      return salvo ? (JSON.parse(salvo) as HistoricoItem[]) : [];
    } catch {
      return [];
    }
  });
  const [favoritos, setFavoritos] = useState<HistoricoItem[]>(() => {
    try {
      const salvo = localStorage.getItem(FAVORITOS_KEY);
      return salvo ? (JSON.parse(salvo) as HistoricoItem[]) : [];
    } catch {
      return [];
    }
  });
  const [comparacao, setComparacao] = useState<NormalizedCompany[]>([]);

  const rawFiltrado = useMemo(() => {
    if (!raw) return null;
    if (!filtro.trim()) return raw;
    return filtrarJson(raw, filtro.trim().toLowerCase());
  }, [raw, filtro]);

  const camposPreenchidos = useMemo(() => {
    return raw ? contarCamposPreenchidos(raw) : 0;
  }, [raw]);

  const indiceBuscaLocal = useMemo(() => {
    return company && raw ? montarIndiceBuscaLocal(company) : null;
  }, [company, raw]);

  const resultadosBuscaLocal = useMemo(() => {
    return indiceBuscaLocal ? buscarLocal(indiceBuscaLocal, buscaAvancada) : [];
  }, [indiceBuscaLocal, buscaAvancada]);

  const estaNosFavoritos = favoritos.some((f) => f.company.cnpj === company?.cnpj);
  const estaNaComparacao = comparacao.some((item) => item.cnpj === company?.cnpj);

  const empresasRelacionadas = useMemo(() => {
    if (!company) return [];
    const candidatas = [...historico.map((item) => item.company), ...favoritos.map((item) => item.company)];
    const unicas = candidatas.filter((item, index, lista) => {
      return item.cnpj && lista.findIndex((empresa) => empresa.cnpj === item.cnpj) === index;
    });
    return calcularRelacionamentosLocais(company, unicas);
  }, [company, historico, favoritos]);

  const podeInvestigarEmpresaSelecionada = useMemo(() => {
    if (!empresaReceitaSelecionada) return false;
    if (disponibilidadeInvestigacao?.cnpjBasico === empresaReceitaSelecionada.cnpjBasico) {
      return disponibilidadeInvestigacao.canInvestigate;
    }
    return possuiDadoInvestigavel(estabelecimentosReceita);
  }, [disponibilidadeInvestigacao, empresaReceitaSelecionada, estabelecimentosReceita]);

  async function consultar() {
    await consultarCnpj(cnpj);
  }

  async function consultarCnpj(cnpjEntrada: string) {
    try {
      setErro("");
      setCompany(null);
      setRaw(null);
      setMostrarJson(false);
      setExpandirTudo(false);
      setBuscaAvancada("");
      setCopiadoCampo("");

      const cnpjLimpo = somenteNumeros(cnpjEntrada);

      if (cnpjLimpo.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");
      if (!validarCnpj(cnpjLimpo)) throw new Error("CNPJ inválido.");

      setLoading(true);

      const result = await consultarProvider(provider, cnpjLimpo);
      const normalized = normalizarEmpresa(result);

      setCompany(normalized);
      setRaw(result.raw);
      setCnpj(normalized.cnpj || formatarCnpj(cnpjLimpo));

      const novoHistorico = [
        { company: normalized, raw: result.raw },
        ...historico.filter((item) => item.company.cnpj !== normalized.cnpj),
      ].slice(0, 12);

      setHistorico(novoHistorico);
      localStorage.setItem(HISTORICO_KEY, JSON.stringify(novoHistorico));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setCnpj("");
    setCompany(null);
    setRaw(null);
    setErro("");
    setFiltro("");
    setMostrarJson(false);
    setExpandirTudo(false);
    setBuscaAvancada("");
    setCopiadoCampo("");
  }

  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") consultar();
  }

  async function pesquisarReceita() {
    try {
      const termo = buscaReceita.trim();
      setErroReceita("");

      if (termo.length < 2) {
        setResultadosReceita([]);
        setReceitaPesquisada(false);
        throw new Error("Digite pelo menos 2 caracteres para buscar.");
      }

      setLoadingReceita(true);
      setEmpresaReceitaSelecionada(null);
      setEstabelecimentosReceita([]);
      setErroEstabelecimentos("");
      setRelatorioInvestigacao(null);
      setDisponibilidadeInvestigacao(null);
      setErroInvestigacao("");
      const resultados = await buscarReceitaFederal(termo);
      setResultadosReceita(resultados);
      setReceitaPesquisada(true);
    } catch (error) {
      setErroReceita(error instanceof Error ? error.message : "Erro ao buscar na Receita Federal.");
    } finally {
      setLoadingReceita(false);
    }
  }

  function onEnterReceita(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") pesquisarReceita();
  }

  async function pesquisarInvestigativa(
    type: InvestigationSearchType = tipoBuscaInvestigativa,
    termoOverride?: string,
  ) {
    try {
      const termo = (termoOverride ?? buscaInvestigativa).trim();
      setErroBuscaInvestigativa("");

      if (termo.length < 2 && !termo.includes("@") && somenteNumeros(termo).length < 8) {
        setResultadosInvestigativa([]);
        setBuscaInvestigativaPesquisada(false);
        throw new Error("Digite pelo menos 2 caracteres ou um CNPJ/telefone válido.");
      }

      setLoadingBuscaInvestigativa(true);
      setTipoBuscaInvestigativa(type);
      if (termoOverride) setBuscaInvestigativa(termoOverride);
      const response = await buscarInvestigativa(termo, type, 20);
      setResultadosInvestigativa(response.data);
      setBuscaInvestigativaPesquisada(true);
    } catch (error) {
      setErroBuscaInvestigativa(error instanceof Error ? error.message : "Erro na busca investigativa.");
    } finally {
      setLoadingBuscaInvestigativa(false);
    }
  }

  function onEnterInvestigativa(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") pesquisarInvestigativa("auto");
  }

  function empresaFromSearchResult(resultado: InvestigationSearchResult): ReceitaEmpresa {
    return {
      cnpjBasico: resultado.cnpjBasico || "",
      razaoSocial: resultado.label,
      naturezaJuridica: null,
      qualificacaoResponsavel: null,
      capitalSocial: null,
      porte: null,
      statusInvestigacao: resultado.investigationStatus ?? null,
    };
  }

  async function abrirEmpresaInvestigativa(resultado: InvestigationSearchResult) {
    if (!resultado.cnpjBasico) return;
    await selecionarEmpresaReceita(empresaFromSearchResult(resultado));
  }

  async function investigarResultadoEmpresa(resultado: InvestigationSearchResult) {
    if (!resultado.cnpjBasico) return;
    const empresa = empresaFromSearchResult(resultado);
    await selecionarEmpresaReceita(empresa);
    try {
      setErroInvestigacao("");
      setLoadingInvestigacao(true);
      const relatorio = await obterRelatorioInvestigacao(empresa.cnpjBasico, profundidadeInvestigacao);
      setRelatorioInvestigacao(relatorio);
    } catch (error) {
      setErroInvestigacao(error instanceof Error ? error.message : "Erro ao gerar relatório de investigação.");
    } finally {
      setLoadingInvestigacao(false);
    }
  }

  async function verEmpresasRelacionadasInvestigativa(resultado: InvestigationSearchResult) {
    await pesquisarInvestigativa("company", resultado.label);
  }

  async function carregarAmostrasReceita() {
    try {
      setErroAmostrasReceita("");
      setLoadingAmostrasReceita(true);
      const amostras = await listarInvestigaveis(20);
      setAmostrasReceita(amostras);
    } catch (error) {
      setErroAmostrasReceita(error instanceof Error ? error.message : "Erro ao carregar investigáveis.");
    } finally {
      setLoadingAmostrasReceita(false);
    }
  }

  async function usarAmostraReceita(empresa: ReceitaEmpresa) {
    setResultadosReceita([]);
    setReceitaPesquisada(false);
    await selecionarEmpresaReceita(empresa);
  }

  async function selecionarEmpresaReceita(empresa: ReceitaEmpresa) {
    setEmpresaReceitaSelecionada(empresa);
    setRelatorioInvestigacao(null);
    setDisponibilidadeInvestigacao(null);
    setErroInvestigacao("");
    await Promise.all([
      carregarEstabelecimentosReceita(empresa.cnpjBasico),
      carregarDisponibilidadeInvestigacao(empresa.cnpjBasico),
    ]);
  }

  async function carregarEstabelecimentosReceita(cnpjBasico: string) {
    try {
      setEstabelecimentosReceita([]);
      setErroEstabelecimentos("");
      setLoadingEstabelecimentos(true);
      const estabelecimentos = await listarEstabelecimentosReceita(cnpjBasico);
      setEstabelecimentosReceita(estabelecimentos);
    } catch (error) {
      setErroEstabelecimentos(error instanceof Error ? error.message : "Erro ao buscar estabelecimentos.");
    } finally {
      setLoadingEstabelecimentos(false);
    }
  }

  async function carregarDisponibilidadeInvestigacao(cnpjBasico: string) {
    try {
      const disponibilidade = await obterDisponibilidadeInvestigacao(cnpjBasico);
      setDisponibilidadeInvestigacao(disponibilidade);
    } catch {
      setDisponibilidadeInvestigacao(null);
    }
  }

  async function consultarEstabelecimento(cnpjCompleto: string) {
    setCnpj(mascararCnpj(cnpjCompleto));
    await consultarCnpj(cnpjCompleto);
  }

  async function investigarEmpresaReceita() {
    if (!empresaReceitaSelecionada) return;

    try {
      setErroInvestigacao("");
      setLoadingInvestigacao(true);
      const relatorio = await obterRelatorioInvestigacao(empresaReceitaSelecionada.cnpjBasico, profundidadeInvestigacao);
      setRelatorioInvestigacao(relatorio);
    } catch (error) {
      setErroInvestigacao(error instanceof Error ? error.message : "Erro ao gerar relatório de investigação.");
    } finally {
      setLoadingInvestigacao(false);
    }
  }

  async function copiarCampo(valor: string, campo: string) {
    if (!valor) return;
    await navigator.clipboard.writeText(valor);
    setCopiadoCampo(campo);
    window.setTimeout(() => setCopiadoCampo(""), 1500);
  }

  function selecionarItem(item: HistoricoItem) {
    setCompany(item.company);
    setRaw(item.raw);
    setCnpj(item.company.cnpj);
    setErro("");
    setFiltro("");
    setMostrarJson(false);
    setExpandirTudo(false);
    setBuscaAvancada("");
    setCopiadoCampo("");
  }

  function abrirEmpresaRelacionada(empresa: NormalizedCompany) {
    const item = [...historico, ...favoritos].find((registro) => registro.company.cnpj === empresa.cnpj);
    if (item) selecionarItem(item);
  }

  function limparHistorico() {
    setHistorico([]);
    localStorage.removeItem(HISTORICO_KEY);
  }

  function toggleFavorito() {
    if (!company || !raw) return;
    const cnpjAtual = company.cnpj;
    const novos = estaNosFavoritos
      ? favoritos.filter((f) => f.company.cnpj !== cnpjAtual)
      : [{ company, raw }, ...favoritos];
    setFavoritos(novos);
    localStorage.setItem(FAVORITOS_KEY, JSON.stringify(novos));
  }

  function adicionarComparacao() {
    if (!company || estaNaComparacao) return;
    setComparacao((atual) => [...atual, company]);
  }

  function removerComparacao(cnpjEmpresa: string) {
    setComparacao((atual) => atual.filter((item) => item.cnpj !== cnpjEmpresa));
  }

  function exportarComparacaoCsv() {
    if (comparacao.length === 0) return;
    const blob = new Blob([gerarCsvComparacao(comparacao)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comparacao-empresas.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarComparacaoPdf() {
    if (comparacao.length === 0) return;
    const janela = window.open("", "_blank");
    if (!janela) return;
    janela.document.write(gerarHtmlComparacao(comparacao));
    janela.document.close();
    janela.focus();
    janela.print();
  }

  function limparFavoritos() {
    setFavoritos([]);
    localStorage.removeItem(FAVORITOS_KEY);
  }

  function abrirGoogleMaps() {
    if (!company) return;
    const q = [company.endereco, company.cidade, company.uf].filter(Boolean).join(", ");
    if (!q) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function abrirReceitaFederal() {
    window.open(
      "https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp",
      "_blank",
      "noopener,noreferrer",
    );
  }

  function abrirGoogle() {
    if (!company) return;
    const q = [company.razaoSocial, company.cnpj].filter(Boolean).join(" ");
    if (!q) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
  }

  function navegarRelacionado(valor: string, disponivel: boolean) {
    if (!disponivel) return;
    setBuscaAvancada(valor);
  }

  function exportarTxt() {
    if (!company) return;
    const agora = new Date().toLocaleString("pt-BR");
    const linhas = [
      `CONSULTA CNPJ — ${agora}`,
      "=".repeat(54),
      `CNPJ:                  ${company.cnpj || "Não informado"}`,
      `Razão Social:          ${company.razaoSocial || "Não informado"}`,
      `Nome Fantasia:         ${company.nomeFantasia || "Não informado"}`,
      `Situação:              ${company.situacao || "Não informado"}`,
      `Abertura:              ${company.abertura || "Não informado"}`,
      `Porte:                 ${company.porte || "Não informado"}`,
      `Natureza Jurídica:     ${company.naturezaJuridica || "Não informado"}`,
      `CNAE Principal:        ${company.cnaePrincipal || "Não informado"}`,
      `Capital Social:        ${company.capitalSocial || "Não informado"}`,
      `Endereço:              ${company.endereco || "Não informado"}`,
      `Cidade / UF:           ${company.cidade || "—"} / ${company.uf || "—"}`,
      `Telefone:              ${company.telefone || "Não informado"}`,
      `E-mail:                ${company.email || "Não informado"}`,
      `Inscrições Estaduais:  ${company.inscricoesEstaduais || "Não informado"}`,
      "=".repeat(54),
      `Provedor: ${company.provider}`,
    ];
    const blob = new Blob([linhas.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cnpj-${somenteNumeros(company.cnpj)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">

        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Consulta empresarial
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
            Consulta CNPJ multi-API
          </h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Consulta por CNPJ com CNPJ.ws, CNPJá Pública e BrasilAPI — modo automático com
            fallback entre provedores.
          </p>
        </header>

        <section className="mb-6 rounded-3xl border border-cyan-500/20 bg-slate-900 p-5 shadow-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
                Motor de Investigação
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Busca Investigativa</h2>
              <p className="mt-1 text-sm text-slate-400">
                Comece por CNPJ, empresa, sócio, telefone, e-mail ou endereço na base local.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
              <input
                value={buscaInvestigativa}
                onChange={(e) => {
                  setBuscaInvestigativa(e.target.value);
                  setBuscaInvestigativaPesquisada(false);
                  setErroBuscaInvestigativa("");
                }}
                onKeyDown={onEnterInvestigativa}
                placeholder="Digite CNPJ, empresa, sócio, telefone, e-mail ou endereço"
                className="flex-1 rounded-2xl border border-cyan-500/30 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => pesquisarInvestigativa("auto")}
                disabled={loadingBuscaInvestigativa}
                className="rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {loadingBuscaInvestigativa ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {erroBuscaInvestigativa && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {erroBuscaInvestigativa}
            </div>
          )}

          {buscaInvestigativaPesquisada && resultadosInvestigativa.length === 0 && !loadingBuscaInvestigativa && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Nenhum resultado encontrado na base local importada.
            </div>
          )}

          {resultadosInvestigativa.length > 0 && (
            <ResultadosBuscaInvestigativa
              resultados={resultadosInvestigativa}
              onAbrirEmpresa={abrirEmpresaInvestigativa}
              onInvestigarEmpresa={investigarResultadoEmpresa}
              onVerEmpresasRelacionadas={verEmpresasRelacionadasInvestigativa}
              onConsultarCnpj={(cnpjCompleto) => consultarCnpj(cnpjCompleto)}
            />
          )}
        </section>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
                Base pública importada
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Busca Receita Federal</h2>
              <p className="mt-1 text-sm text-slate-400">
                Pesquise por razão social ou use uma amostra que já possui estabelecimento importado.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
              <input
                value={buscaReceita}
                onChange={(e) => {
                  setBuscaReceita(e.target.value);
                  setReceitaPesquisada(false);
                  setEmpresaReceitaSelecionada(null);
                  setEstabelecimentosReceita([]);
                  setDisponibilidadeInvestigacao(null);
                  setErroEstabelecimentos("");
                }}
                onKeyDown={onEnterReceita}
                placeholder="Ex: BANCO, ITACAMP..."
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
              <button
                onClick={pesquisarReceita}
                disabled={loadingReceita}
                className="rounded-2xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {loadingReceita ? "Buscando..." : "Buscar"}
              </button>
              <button
                onClick={carregarAmostrasReceita}
                disabled={loadingAmostrasReceita}
                className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-6 py-3 font-bold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-40"
              >
                {loadingAmostrasReceita ? "Carregando..." : "Ver investigáveis"}
              </button>
            </div>
          </div>

          {erroAmostrasReceita && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {erroAmostrasReceita}
            </div>
          )}

          {amostrasReceita.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-400">
                Empresas investigáveis — dados completos disponíveis
              </p>
              <div className="flex flex-wrap gap-2">
                {amostrasReceita.slice(0, 20).map((empresa) => (
                  <button
                    key={empresa.cnpjBasico}
                    onClick={() => usarAmostraReceita(empresa)}
                    className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-left text-xs font-bold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
                    {empresa.razaoSocial || `CNPJ ${empresa.cnpjBasico}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {erroReceita && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {erroReceita}
            </div>
          )}

          {resultadosReceita.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {resultadosReceita.map((empresa) => (
                <button
                  key={empresa.cnpjBasico}
                  onClick={() => selecionarEmpresaReceita(empresa)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    empresaReceitaSelecionada?.cnpjBasico === empresa.cnpjBasico
                      ? "border-cyan-500 bg-slate-950"
                      : "border-slate-800 bg-slate-950 hover:border-cyan-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                      CNPJ básico {empresa.cnpjBasico}
                    </p>
                    <BadgeInvestigacao empresa={empresa} />
                  </div>
                  <h3 className="mt-2 break-words text-sm font-black leading-6 text-white">
                    {empresa.razaoSocial || "Razão social não informada"}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400">Porte: {empresa.porte || "Não informado"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Capital: {empresa.capitalSocial || "Não informado"}
                  </p>
                </button>
              ))}
            </div>
          )}

          {empresaReceitaSelecionada && (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Estabelecimentos
                  </p>
                  <h3 className="mt-1 font-black text-white">
                    {empresaReceitaSelecionada.razaoSocial || empresaReceitaSelecionada.cnpjBasico}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {loadingEstabelecimentos && <p className="text-sm font-bold text-cyan-300">Carregando...</p>}
                  {empresaReceitaSelecionada && podeInvestigarEmpresaSelecionada && (
                    <button
                      onClick={investigarEmpresaReceita}
                      disabled={loadingInvestigacao}
                      className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40"
                    >
                      {loadingInvestigacao ? "Investigando..." : "Investigar vínculos"}
                    </button>
                  )}
                </div>
              </div>

              {erroEstabelecimentos && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {erroEstabelecimentos}
                </div>
              )}

              {!loadingEstabelecimentos && !erroEstabelecimentos && estabelecimentosReceita.length === 0 && (
                <p className="mt-4 text-sm text-slate-400">
                  Nenhum estabelecimento encontrado na amostra importada.
                </p>
              )}

              {estabelecimentosReceita.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {estabelecimentosReceita.map((estabelecimento) => (
                    <div key={estabelecimento.cnpj} className="rounded-xl border border-slate-800 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                        {formatarCnpj(estabelecimento.cnpj)}
                      </p>
                      <p className="mt-2 text-sm font-bold text-white">
                        {estabelecimento.nomeFantasia || "Nome fantasia não informado"}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Situação: {estabelecimento.situacaoCadastral || "Não informado"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        CNAE: {estabelecimento.cnaePrincipal || "Não informado"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Local: {[estabelecimento.municipioNome || estabelecimento.municipio, estabelecimento.uf].filter(Boolean).join(" / ") || "Não informado"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Telefone: {estabelecimento.telefone || "Não informado"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        E-mail: {estabelecimento.email || "Não informado"}
                      </p>
                      {estabelecimento.cnpj ? (
                        <button
                          onClick={() => consultarEstabelecimento(estabelecimento.cnpj)}
                          className="mt-3 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                        >
                          Consultar CNPJ
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {erroInvestigacao && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {erroInvestigacao}
                </div>
              )}

              {relatorioInvestigacao && (
                <RelatorioInvestigacao
                  relatorio={relatorioInvestigacao}
                  statusInvestigacao={resolveStatusInvestigacao(empresaReceitaSelecionada)}
                  onAbrirEmpresaReceita={selecionarEmpresaReceita}
                  profundidade={profundidadeInvestigacao}
                  onAlterarProfundidade={async (depth) => {
                    if (!empresaReceitaSelecionada) return;
                    setProfundidadeInvestigacao(depth);
                    try {
                      setErroInvestigacao("");
                      setLoadingInvestigacao(true);
                      const relatorio = await obterRelatorioInvestigacao(empresaReceitaSelecionada.cnpjBasico, depth);
                      setRelatorioInvestigacao(relatorio);
                    } catch (error) {
                      setErroInvestigacao(error instanceof Error ? error.message : "Erro ao gerar relatório de investigação.");
                    } finally {
                      setLoadingInvestigacao(false);
                    }
                  }}
                />
              )}
            </div>
          )}

          {!loadingReceita && receitaPesquisada && !erroReceita && resultadosReceita.length === 0 && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Nenhuma empresa encontrada na base Receita local.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto_auto]">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="auto">Automático</option>
              <option value="cnpjws">CNPJ.ws</option>
              <option value="cnpja">CNPJá Pública</option>
              <option value="brasilapi">BrasilAPI</option>
            </select>

            <input
              value={cnpj}
              onChange={(e) => setCnpj(mascararCnpj(e.target.value))}
              onKeyDown={onEnter}
              placeholder="Digite o CNPJ: 00.000.000/0000-00"
              inputMode="numeric"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-lg font-semibold text-white outline-none focus:border-cyan-400"
            />

            <button
              onClick={consultar}
              disabled={loading}
              className="rounded-2xl bg-cyan-500 px-7 py-4 font-bold text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>

            <button
              onClick={limpar}
              className="rounded-2xl border border-slate-700 px-7 py-4 font-bold text-slate-200 hover:bg-slate-800"
            >
              Limpar
            </button>
          </div>

          {erro && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              {erro}
            </div>
          )}
        </section>

        {loading && <Skeleton />}

        {company && raw && (
          <>
            {/* Resumo da empresa */}
            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge texto={company.situacao || "Situação não informada"} />
                    <Badge texto={company.provider} />
                    <Badge texto={`${camposPreenchidos} campos preenchidos`} />
                  </div>
                  <h2 className="mt-4 text-3xl font-black text-white">
                    {company.razaoSocial || "Razão social não informada"}
                  </h2>
                  <p className="mt-2 text-slate-400">{company.cnpj}</p>
                </div>

                <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Capital social</p>
                  <p className="mt-1 text-2xl font-black text-cyan-300">
                    {company.capitalSocial || "Não informado"}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-800 pb-5">
                <BotaoCopiar
                  campo="cnpj"
                  valor={company.cnpj}
                  label="Copiar CNPJ"
                  copiadoCampo={copiadoCampo}
                  onCopiar={copiarCampo}
                />
                <BotaoCopiar
                  campo="razao"
                  valor={company.razaoSocial}
                  label="Copiar Razão Social"
                  copiadoCampo={copiadoCampo}
                  onCopiar={copiarCampo}
                />
                <BotaoCopiar
                  campo="endereco"
                  valor={company.endereco}
                  label="Copiar Endereço"
                  copiadoCampo={copiadoCampo}
                  onCopiar={copiarCampo}
                />
                <BotaoCopiar
                  campo="email"
                  valor={company.email}
                  label="Copiar E-mail"
                  copiadoCampo={copiadoCampo}
                  onCopiar={copiarCampo}
                />
                <button
                  onClick={abrirGoogleMaps}
                  disabled={!company.endereco}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                >
                  Google Maps
                </button>
                <button
                  onClick={abrirReceitaFederal}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                >
                  Receita Federal
                </button>
                <button
                  onClick={abrirGoogle}
                  disabled={!company.razaoSocial && !company.cnpj}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                >
                  Google
                </button>
                <button
                  onClick={exportarTxt}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                >
                  Exportar TXT
                </button>
                <button
                  onClick={toggleFavorito}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    estaNosFavoritos
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20"
                      : "border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {estaNosFavoritos ? "Desfavoritar" : "Favoritar"}
                </button>
                <button
                  onClick={adicionarComparacao}
                  disabled={estaNaComparacao}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                >
                  {estaNaComparacao ? "Na comparação" : "Adicionar à comparação"}
                </button>
              </div>

              {indiceBuscaLocal && (
                <div className="mt-5 border-b border-slate-800 pb-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white">Inteligência empresarial</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Busca local nos dados já carregados e navegação por relações disponíveis.
                      </p>
                    </div>
                    <input
                      value={buscaAvancada}
                      onChange={(e) => setBuscaAvancada(e.target.value)}
                      placeholder="Buscar razão social, fantasia, sócio, CNAE, cidade ou e-mail..."
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 lg:max-w-xl"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {indiceBuscaLocal.relacionados.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navegarRelacionado(item.valor, item.disponivel)}
                        disabled={!item.disponivel}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:border-slate-700 disabled:bg-slate-950 disabled:text-slate-500"
                      >
                        {item.label}: {item.valor}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {resultadosBuscaLocal.length > 0 ? (
                      resultadosBuscaLocal.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 ${
                            item.disponivel
                              ? "border-slate-800 bg-slate-950"
                              : "border-slate-800 bg-slate-950/60 text-slate-500"
                          }`}
                        >
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {item.tipo}
                          </p>
                          <p className="mt-2 break-words text-sm font-bold leading-6">{item.valor}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                        Nenhum dado carregado corresponde à busca.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 border-b border-slate-800 pb-5">
                <h3 className="text-xl font-black text-white">Dados adicionais</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Enriquecimento exibido somente quando o provedor retorna a informação.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <IndicadorAdicional label="MEI" valor={company.mei} />
                  <IndicadorAdicional label="Simples Nacional" valor={company.simplesNacional} />
                  <Card titulo="Porte" valor={company.porte || DADO_INDISPONIVEL} />
                  <Card titulo="Natureza jurídica" valor={company.naturezaJuridica || DADO_INDISPONIVEL} />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <ListaAdicional titulo="Sócios" itens={company.socios ?? []} />
                  <ListaAdicional titulo="Telefones" itens={company.telefones ?? []} />
                  <ListaAdicional titulo="E-mails" itens={company.emails ?? []} />
                </div>
              </div>

              {/* Cards de dados */}
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card titulo="Nome fantasia" valor={company.nomeFantasia} />
                <Card titulo="Cidade / UF" valor={`${company.cidade || "—"} / ${company.uf || "—"}`} />
                <Card titulo="E-mail" valor={company.email} />
                <Card titulo="Telefone" valor={company.telefone} />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <Card titulo="Endereço" valor={company.endereco} />
                <Card titulo="CNAE principal" valor={company.cnaePrincipal} />
                <Card titulo="Abertura" valor={company.abertura} />
                <Card titulo="Natureza jurídica" valor={company.naturezaJuridica} />
                {company.inscricoesEstaduais ? (
                  <Card titulo="Inscrições estaduais" valor={company.inscricoesEstaduais} />
                ) : null}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Comparação empresa x empresa</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Adicione empresas consultadas para comparar os principais dados lado a lado.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportarComparacaoCsv}
                    disabled={comparacao.length === 0}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Exportar CSV
                  </button>
                  <button
                    onClick={exportarComparacaoPdf}
                    disabled={comparacao.length === 0}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Exportar PDF
                  </button>
                </div>
              </div>

              {comparacao.length > 0 ? (
                <ComparacaoEmpresas empresas={comparacao} onRemover={removerComparacao} />
              ) : (
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
                  Nenhuma empresa adicionada para comparação.
                </div>
              )}

              <EmpresasRelacionadas empresas={empresasRelacionadas} onAbrir={abrirEmpresaRelacionada} />
            </section>

            {/* Dados completos / JSON */}
            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Dados completos</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Filtre e explore todos os campos retornados pelo provedor.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setMostrarJson(!mostrarJson)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                  >
                    {mostrarJson ? "Ocultar JSON" : "Ver JSON"}
                  </button>
                  <button
                    onClick={() => copiarCampo(JSON.stringify(raw, null, 2), "json")}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    {copiadoCampo === "json" ? "Copiado" : "Copiar JSON"}
                  </button>
                  <button
                    onClick={() => setExpandirTudo(true)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold"
                  >
                    Expandir tudo
                  </button>
                  <button
                    onClick={() => setExpandirTudo(false)}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold"
                  >
                    Recolher tudo
                  </button>
                </div>
              </div>

              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Filtrar por nome, cidade, CNAE, sócio, inscrição, e-mail..."
                className="mb-5 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />

              {mostrarJson ? (
                <pre className="max-h-[700px] overflow-auto rounded-2xl bg-black p-5 text-xs leading-6 text-green-300">
                  {JSON.stringify(raw, null, 2)}
                </pre>
              ) : rawFiltrado ? (
                <JsonTree valor={rawFiltrado} raiz expandido={expandirTudo} />
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-400">
                  Nenhum campo encontrado.
                </div>
              )}
            </section>
          </>
        )}

        {/* Histórico + Favoritos — sempre visíveis quando há conteúdo */}
        {(historico.length > 0 || favoritos.length > 0) && (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {historico.length > 0 && (
              <PainelLateral
                titulo="Histórico"
                subtitulo="Salvo neste navegador."
                itens={historico}
                cnpjAtivo={company?.cnpj ?? ""}
                onSelecionar={selecionarItem}
                onLimpar={limparHistorico}
              />
            )}
            {favoritos.length > 0 && (
              <PainelLateral
                titulo="Favoritos"
                subtitulo="Consultas salvas como favorito."
                itens={favoritos}
                cnpjAtivo={company?.cnpj ?? ""}
                onSelecionar={selecionarItem}
                onLimpar={limparFavoritos}
              />
            )}
          </section>
        )}

      </div>
    </main>
  );
}

type ExplorationRelationType = Extract<InvestigationRelation["type"], "same_partner" | "same_phone" | "same_email" | "same_address">;

function possuiDadoInvestigavel(estabelecimentos: ReceitaEstabelecimento[]): boolean {
  return estabelecimentos.some((estabelecimento) => {
    return Boolean(estabelecimento.telefone || estabelecimento.email || estabelecimento.enderecoNormalizado);
  });
}

function montarGruposExploracao(
  estabelecimentos: ReceitaEstabelecimento[],
  partners: InvestigationReport["target"]["partners"],
  relations: InvestigationRelation[],
) {
  const totalPorTipo = (tipo: ExplorationRelationType) => relations.filter((relation) => relation.type === tipo).length;

  return [
    {
      key: "same_partner" as const,
      titulo: "Sócios",
      descricao: "Outras empresas do sócio",
      total: totalPorTipo("same_partner"),
      disponivel: partners.length > 0 || totalPorTipo("same_partner") > 0,
      emptyMessage: "Nenhuma outra empresa do sócio foi encontrada na base local.",
    },
    {
      key: "same_phone" as const,
      titulo: "Telefone",
      descricao: "Empresas com mesmo telefone",
      total: totalPorTipo("same_phone"),
      disponivel: estabelecimentos.some((item) => Boolean(item.telefone)) || totalPorTipo("same_phone") > 0,
      emptyMessage: "Nenhuma empresa com o mesmo telefone foi encontrada na base local.",
    },
    {
      key: "same_email" as const,
      titulo: "Email",
      descricao: "Empresas com mesmo email",
      total: totalPorTipo("same_email"),
      disponivel: estabelecimentos.some((item) => Boolean(item.email)) || totalPorTipo("same_email") > 0,
      emptyMessage: "Nenhuma empresa com o mesmo email foi encontrada na base local.",
    },
    {
      key: "same_address" as const,
      titulo: "Endereço",
      descricao: "Empresas no mesmo endereço",
      total: totalPorTipo("same_address"),
      disponivel: estabelecimentos.some((item) => Boolean(item.enderecoNormalizado)) || totalPorTipo("same_address") > 0,
      emptyMessage: "Nenhuma empresa no mesmo endereço foi encontrada na base local.",
    },
  ];
}

// ——— Componentes ———

function BadgeInvestigacao({ empresa }: { empresa: ReceitaEmpresa }) {
  const status = resolveStatusInvestigacao(empresa);
  if (!status) return null;
  if (status === "STRONG") {
    return (
      <span className="shrink-0 rounded-lg bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
        Investigável forte
      </span>
    );
  }
  if (status === "PARTIAL") {
    return (
      <span className="shrink-0 rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
        Investigável parcial
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-lg bg-slate-700/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      Somente cadastral
    </span>
  );
}

function RelatorioInvestigacao({
  relatorio,
  statusInvestigacao,
  onAbrirEmpresaReceita,
  profundidade,
  onAlterarProfundidade,
}: {
  relatorio: InvestigationReport;
  statusInvestigacao: import("./services/receita").StatusInvestigacao | null | undefined;
  onAbrirEmpresaReceita: (empresa: ReceitaEmpresa) => void;
  profundidade: 1 | 2;
  onAlterarProfundidade: (depth: 1 | 2) => void;
}) {
  const { summary, target, findings, evidenceStrength, relations, graph } = relatorio;
  const [tipoExplorado, setTipoExplorado] = useState<ExplorationRelationType>("same_partner");
  const gruposExploracao = montarGruposExploracao(target.establishments, target.partners, relations);
  const grupoAtivo = gruposExploracao.find((grupo) => grupo.key === tipoExplorado && grupo.disponivel)
    ?? gruposExploracao.find((grupo) => grupo.disponivel)
    ?? gruposExploracao[0];
  const relacoesExploradas = relations.filter((relation) => relation.type === grupoAtivo.key);
  const abrirDossie = () => {
    window.open(obterUrlDossieInvestigacao(target.company.cnpjBasico), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-slate-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Relatório de Investigação</p>
          <h3 className="mt-1 text-xl font-black text-white">
            {target.company.razaoSocial || target.company.cnpjBasico}
          </h3>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Profundidade do grafo
            <select
              value={profundidade}
              onChange={(event) => onAlterarProfundidade(Number(event.target.value) as 1 | 2)}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 sm:w-40"
            >
              <option value={1}>Nível 1 (direto)</option>
              <option value={2}>Nível 2 (expansão candidata)</option>
            </select>
          </label>
          <button
            onClick={abrirDossie}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20"
          >
            Gerar dossiê HTML
          </button>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-amber-200">
          Limitações da base (leia antes do dossiê)
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-100/90">
          <li>CPF mascarado na base pública; correspondência por nome pode envolver homônimos.</li>
          <li>Sem percentuais societários, atos societários, UBO formal ou prova patrimonial.</li>
          <li>Base local parcial — vínculos são hipóteses com força de evidência, não conclusão.</li>
          {summary.dataLimitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {evidenceStrength.limitations.map((item) => (
            <li key={`ev-${item}`}>{item}</li>
          ))}
        </ul>
      </details>

      {/* Resumo Executivo */}
      <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo Executivo</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            summary.investigationLevel === "HIGH"
              ? "bg-red-500/20 text-red-300"
              : summary.investigationLevel === "MEDIUM"
              ? "bg-amber-500/20 text-amber-300"
              : "bg-slate-700/60 text-slate-400"
          }`}>
            Nível {summary.investigationLevel === "HIGH" ? "Alto" : summary.investigationLevel === "MEDIUM" ? "Médio" : "Baixo"}
          </span>
          {statusInvestigacao && (
            <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              statusInvestigacao === "STRONG"
                ? "bg-cyan-500/20 text-cyan-300"
                : statusInvestigacao === "PARTIAL"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-slate-700/60 text-slate-400"
            }`}>
              {statusInvestigacao === "STRONG" ? "Investigável forte" : statusInvestigacao === "PARTIAL" ? "Investigável parcial" : "Somente cadastral"}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { label: "Empresas vinculadas", val: summary.totalRelatedCompanies },
            { label: "Por sócio", val: summary.totalRelatedByPartner },
            { label: "Por endereço", val: summary.totalRelatedByAddress },
            { label: "Por telefone", val: summary.totalPhoneLinks },
            { label: "Por e-mail", val: summary.totalEmailLinks },
            { label: "Sócios", val: summary.totalPartners },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-lg bg-slate-900/60 p-2 text-center">
              <p className="text-lg font-black text-white">{val}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {summary.keyFindings.length > 0 && (
          <ul className="mt-3 space-y-1">
            {summary.keyFindings.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="mt-0.5 shrink-0 text-cyan-400">▸</span>
                {f}
              </li>
            ))}
          </ul>
        )}

        {statusInvestigacao === "PARTIAL" && (
          <p className="mt-3 text-xs text-amber-300/80">
            Alguns vínculos podem não aparecer porque sócios não estão disponíveis nesta amostra.
          </p>
        )}
        {statusInvestigacao === "CADASTRAL" && (
          <p className="mt-3 text-xs text-slate-500">Somente dados cadastrais disponíveis.</p>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Card titulo="Sócios encontrados" valor={String(summary.totalPartners)} />
        <Card titulo="Por sócio" valor={String(summary.totalRelatedByPartner)} />
        <Card titulo="Por endereço" valor={String(summary.totalRelatedByAddress)} />
        <Card titulo="Matriz/filiais" valor={String(summary.totalBranches)} />
      </div>

      {summary.dataLimitations.length > 0 && (
        <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
          {summary.dataLimitations.map((hint) => (
            <p key={hint} className="text-sm font-semibold text-yellow-200">
              {hint}
            </p>
          ))}
        </div>
      )}

      <ForcaDasEvidencias evidenceStrength={evidenceStrength} />

      <AchadosInvestigacao findings={findings} />

      <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-slate-950 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Explorar relações</p>
        <p className="mt-1 text-sm text-slate-400">
          Navegue por vínculos reais encontrados na base local, sem depender da classificação STRONG/PARTIAL.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {gruposExploracao.map((grupo) => (
            <button
              key={grupo.key}
              onClick={() => setTipoExplorado(grupo.key)}
              disabled={!grupo.disponivel}
              className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                grupoAtivo.key === grupo.key
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-slate-800 bg-slate-900 hover:border-cyan-500/50"
              }`}
            >
              <p className="text-sm font-black text-white">{grupo.titulo}</p>
              <p className="mt-1 text-xs text-slate-400">{grupo.descricao}</p>
              <p className="mt-2 text-xs font-bold text-cyan-300">{grupo.total} vínculo(s)</p>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{grupoAtivo.titulo}</p>
          {relacoesExploradas.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {relacoesExploradas.map((relation, index) => (
                <button
                  key={`explorar-${relation.type}-${relation.company.cnpjBasico}-${index}`}
                  onClick={() => onAbrirEmpresaReceita(relation.company)}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-left hover:border-cyan-500/60"
                >
                  <p className="text-sm font-bold text-white">
                    {relation.company.razaoSocial || relation.company.cnpjBasico}
                  </p>
                  <p className="mt-1 text-xs text-cyan-300">CNPJ básico {relation.company.cnpjBasico}</p>
                  <p className="mt-1 text-xs text-slate-400">{relation.reason}</p>
                  <ResumoEvidenciaRelation relation={relation} />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">{grupoAtivo.emptyMessage}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ListaAdicional
          titulo="Sócios"
          itens={target.partners.map((partner) => {
            return [partner.nome, partner.qualificacao, partner.dataEntrada].filter(Boolean).join(" — ");
          })}
        />
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Empresas relacionadas</p>
          {relations.length > 0 ? (
            <div className="mt-3 space-y-3">
              {relations.map((relation, index) => (
                <div key={`${relation.type}-${relation.company.cnpjBasico}-${index}`} className="rounded-xl border border-slate-800 p-3">
                  <p className="font-bold text-white">
                    {relation.company.razaoSocial || relation.company.cnpjBasico}
                  </p>
                  <p className="mt-1 text-xs text-cyan-300">{relation.classification} · {relation.type}</p>
                  <p className="mt-1 text-xs text-slate-400">{relation.reason}</p>
                  <ResumoEvidenciaRelation relation={relation} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">Nenhum vínculo detectado.</p>
          )}
        </div>
      </div>

      <GrafoInvestigacao
        nodes={graph.nodes}
        edges={graph.edges}
        relations={relations}
        targetCompany={target.company}
        onAbrirEmpresaReceita={onAbrirEmpresaReceita}
      />
    </div>
  );
}

function ForcaDasEvidencias({ evidenceStrength }: { evidenceStrength: InvestigationReport["evidenceStrength"] }) {
  return (
    <div className={`mt-4 rounded-2xl border p-4 ${evidenceStrengthContainerClass(evidenceStrength.level)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Força das evidências</p>
          <h4 className="mt-1 text-lg font-black text-white">
            {evidenceStrength.level === "HIGH" ? "ALTA" : evidenceStrength.level === "MEDIUM" ? "MÉDIA" : "BAIXA"}
          </h4>
        </div>
        <div className="rounded-xl bg-slate-950/70 px-4 py-3 text-center">
          <p className="text-2xl font-black text-white">{evidenceStrength.points}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">pontos de evidência</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-950/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Motivos</p>
          <ul className="mt-2 space-y-1">
            {evidenceStrength.reasons.map((reason) => (
              <li key={reason} className="text-xs leading-5 text-slate-200">✓ {reason}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Limitações</p>
          <ul className="mt-2 space-y-1">
            {evidenceStrength.limitations.map((limitation) => (
              <li key={limitation} className="text-xs leading-5 text-slate-200">⚠ {limitation}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AchadosInvestigacao({ findings }: { findings: InvestigationReport["findings"] }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Achados de investigação</p>
      <p className="mt-1 text-sm text-slate-400">
        Leitura interpretativa dos vínculos encontrados, com severidade e evidências.
      </p>

      {findings.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {findings.map((finding) => (
            <div key={`${finding.type}-${finding.title}`} className={`rounded-2xl border p-4 ${findingCardClass(finding.severity)}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-black text-white">{finding.title}</h4>
                <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${findingBadgeClass(finding.severity)}`}>
                  {finding.severity}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{finding.description}</p>
              <div className="mt-3 rounded-xl bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Evidências</p>
                <ul className="mt-2 space-y-1">
                  {finding.evidence.map((evidence) => (
                    <li key={evidence} className="flex items-start gap-2 text-xs leading-5 text-slate-300">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Nenhum achado gerado com os dados disponíveis.</p>
      )}
    </div>
  );
}

function ResumoEvidenciaRelation({ relation }: { relation: InvestigationRelation }) {
  const evidence = relation.evidence;
  const entityConfidence = relation.entityConfidence;
  const showHomonymAlert =
    relation.type === "same_partner" &&
    entityConfidence &&
    (entityConfidence.level === "LOW" || entityConfidence.level === "MEDIUM");

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
          {relation.classification}
        </span>
        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${confidenceBadgeClass(evidence.confidence)}`}>
          Confiança {evidence.confidence}
        </span>
        {entityConfidence && (
          <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${confidenceBadgeClass(entityConfidence.level)}`}>
            Entidade {entityConfidence.level}
          </span>
        )}
      </div>
      {showHomonymAlert && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-100">
          Esta relação pode conter homônimos
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-300">
        <span className="font-bold text-slate-100">{evidence.field}:</span> {evidence.value || "Não informado"}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{evidence.explanation}</p>
      {entityConfidence && entityConfidence.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-400">
          {entityConfidence.reasons.map((reason, index) => (
            <li key={`${reason}-${index}`}>{reason}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
        Fonte: {evidence.source}
      </p>
    </div>
  );
}

function evidenceStrengthContainerClass(level: InvestigationReport["evidenceStrength"]["level"]): string {
  if (level === "HIGH") return "border-red-500/30 bg-red-500/10";
  if (level === "MEDIUM") return "border-amber-500/30 bg-amber-500/10";
  return "border-cyan-500/20 bg-cyan-500/5";
}

function findingCardClass(severity: InvestigationReport["findings"][number]["severity"]): string {
  if (severity === "HIGH") return "border-red-500/30 bg-red-500/10";
  if (severity === "MEDIUM") return "border-amber-500/30 bg-amber-500/10";
  return "border-slate-700 bg-slate-900/80";
}

function findingBadgeClass(severity: InvestigationReport["findings"][number]["severity"]): string {
  if (severity === "HIGH") return "bg-red-500/20 text-red-200";
  if (severity === "MEDIUM") return "bg-amber-500/20 text-amber-200";
  return "bg-cyan-500/10 text-cyan-200";
}

function confidenceBadgeClass(confidence: InvestigationRelation["evidence"]["confidence"]): string {
  if (confidence === "HIGH") return "bg-red-500/20 text-red-200";
  if (confidence === "MEDIUM") return "bg-amber-500/20 text-amber-200";
  return "bg-cyan-500/10 text-cyan-200";
}

function ResultadosBuscaInvestigativa({
  resultados,
  onAbrirEmpresa,
  onInvestigarEmpresa,
  onVerEmpresasRelacionadas,
  onConsultarCnpj,
}: {
  resultados: InvestigationSearchResult[];
  onAbrirEmpresa: (resultado: InvestigationSearchResult) => void;
  onInvestigarEmpresa: (resultado: InvestigationSearchResult) => void;
  onVerEmpresasRelacionadas: (resultado: InvestigationSearchResult) => void;
  onConsultarCnpj: (cnpjCompleto: string) => void;
}) {
  const grupos = [
    { key: "company" as const, titulo: "Empresas" },
    { key: "partner" as const, titulo: "Sócios" },
    { key: "address" as const, titulo: "Endereços" },
    { key: "phone" as const, titulo: "Telefones" },
    { key: "email" as const, titulo: "E-mails" },
  ];

  return (
    <div className="mt-5 space-y-5">
      {grupos.map(({ key, titulo }) => {
        const itens = resultados.filter((item) => item.type === key);
        if (itens.length === 0) return null;

        return (
          <div key={key}>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">{titulo}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {itens.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
                  {item.evidenceHint && (
                    <p className="mt-2 text-xs leading-5 text-cyan-200/80">{item.evidenceHint}</p>
                  )}
                  {item.investigationStatus && (
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Status {item.investigationStatus}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.type === "company" && item.cnpjBasico && (
                      <>
                        <button
                          onClick={() => onInvestigarEmpresa(item)}
                          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20"
                        >
                          Investigar vínculos
                        </button>
                        <button
                          onClick={() => onAbrirEmpresa(item)}
                          className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                        >
                          Abrir empresa
                        </button>
                        {item.cnpjCompleto && (
                          <button
                            onClick={() => onConsultarCnpj(item.cnpjCompleto!)}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                          >
                            Consultar CNPJ
                          </button>
                        )}
                      </>
                    )}
                    {item.type === "partner" && (
                      <button
                        onClick={() => onVerEmpresasRelacionadas(item)}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20"
                      >
                        Ver empresas deste sócio
                      </button>
                    )}
                    {(item.type === "phone" || item.type === "email" || item.type === "address") && (
                      <button
                        onClick={() => onVerEmpresasRelacionadas(item)}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20"
                      >
                        Ver empresas relacionadas
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GrafoInvestigacao({
  nodes,
  edges,
  relations,
  targetCompany,
  onAbrirEmpresaReceita,
}: {
  nodes: InvestigationGraphNode[];
  edges: InvestigationGraphEdge[];
  relations: InvestigationRelation[];
  targetCompany: ReceitaEmpresa;
  onAbrirEmpresaReceita: (empresa: ReceitaEmpresa) => void;
}) {
  const [noSelecionado, setNoSelecionado] = useState<string | null>(null);
  const [arestaSelecionada, setArestaSelecionada] = useState<string | null>(null);
  const [filtrosClassificacao, setFiltrosClassificacao] = useState<Record<EvidenceClassification, boolean>>({
    DECLARADO: true,
    INFERIDO: true,
    VALIDADO: true,
    COMPROVADO: true,
  });

  const arestasVisiveis = edges.filter((edge) => filtrosClassificacao[edge.classification]);
  const nosVisiveis = nodes.filter((node) => {
    if (node.id === `company:${targetCompany.cnpjBasico}`) return true;
    return arestasVisiveis.some((edge) => edge.from === node.id || edge.to === node.id);
  });

  const noAtivo = nosVisiveis.find((node) => node.id === noSelecionado) ?? null;
  const arestaAtiva = arestasVisiveis.find((edge) => chaveAresta(edge) === arestaSelecionada) ?? null;

  const arestasDoNo = noAtivo
    ? arestasVisiveis.filter((edge) => edge.from === noAtivo.id || edge.to === noAtivo.id)
    : [];

  function alternarFiltro(classificacao: EvidenceClassification) {
    setFiltrosClassificacao((atual) => ({ ...atual, [classificacao]: !atual[classificacao] }));
    setNoSelecionado(null);
    setArestaSelecionada(null);
  }

  function selecionarNo(nodeId: string) {
    setNoSelecionado(nodeId);
    setArestaSelecionada(null);
  }

  function selecionarAresta(edge: InvestigationGraphEdge) {
    setArestaSelecionada(chaveAresta(edge));
    setNoSelecionado(null);
  }

  function empresaDoNo(node: InvestigationGraphNode): ReceitaEmpresa | null {
    if (node.type !== "company" || !node.cnpjBasico) return null;
    if (node.cnpjBasico === targetCompany.cnpjBasico) return targetCompany;
    const relation = relations.find((item) => item.company.cnpjBasico === node.cnpjBasico);
    if (relation) return relation.company;
    return {
      cnpjBasico: node.cnpjBasico,
      razaoSocial: node.label,
      naturezaJuridica: null,
      qualificacaoResponsavel: null,
      capitalSocial: null,
      porte: null,
    };
  }

  function relationDaAresta(edge: InvestigationGraphEdge): InvestigationRelation | null {
    const targetId = `company:${targetCompany.cnpjBasico}`;
    const relatedNodeId = edge.from === targetId ? edge.to : edge.from;
    if (relatedNodeId.startsWith("company:")) {
      const cnpjBasico = relatedNodeId.replace("company:", "");
      return relations.find((item) => item.company.cnpjBasico === cnpjBasico && item.type === edge.relationType) ?? null;
    }
    return relations.find((item) => item.type === edge.relationType && item.reason === edge.label) ?? null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Grafo investigável</p>
          <p className="mt-1 text-sm text-slate-400">
            Clique em nós e conexões para entender entidades, evidências e próximos passos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["DECLARADO", "INFERIDO", "VALIDADO", "COMPROVADO"] as EvidenceClassification[]).map((classificacao) => (
            <button
              key={classificacao}
              onClick={() => alternarFiltro(classificacao)}
              className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-opacity ${
                filtrosClassificacao[classificacao]
                  ? classificationBadgeClass(classificacao)
                  : "border-slate-700 bg-slate-900 text-slate-500 opacity-50"
              }`}
            >
              {classificacao}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nós ({nosVisiveis.length})</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nosVisiveis.map((node) => {
              const conexoes = arestasVisiveis.filter((edge) => edge.from === node.id || edge.to === node.id);
              const classificacaoPrincipal = conexoes[0]?.classification ?? "DECLARADO";
              return (
                <button
                  key={node.id}
                  onClick={() => selecionarNo(node.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                    noSelecionado === node.id
                      ? `${classificationNodeClass(classificacaoPrincipal)} ring-2 ring-white/20`
                      : `${classificationNodeClass(classificacaoPrincipal)} hover:brightness-110`
                  }`}
                >
                  <p className="font-bold">{node.label}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest opacity-80">{rotuloTipoNo(node.type)}</p>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Conexões ({arestasVisiveis.length})
          </p>
          <div className="mt-3 space-y-2">
            {arestasVisiveis.map((edge) => {
              const origem = nodes.find((node) => node.id === edge.from);
              const destino = nodes.find((node) => node.id === edge.to);
              return (
                <button
                  key={chaveAresta(edge)}
                  onClick={() => selecionarAresta(edge)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    arestaSelecionada === chaveAresta(edge)
                      ? `${classificationEdgeClass(edge.classification)} ring-2 ring-white/20`
                      : `${classificationEdgeClass(edge.classification)} hover:brightness-110`
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${classificationBadgeClass(edge.classification)}`}>
                      {edge.classification}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {edge.relationType}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-200">
                    {origem?.label ?? edge.from} → {destino?.label ?? edge.to}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{edge.label}</p>
                </button>
              );
            })}
            {arestasVisiveis.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma conexão visível com os filtros atuais.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          {!noAtivo && !arestaAtiva && (
            <p className="text-sm text-slate-400">
              Selecione um nó ou uma conexão para ver tipo, evidências e próximas entidades investigáveis.
            </p>
          )}

          {noAtivo && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Detalhe do nó</p>
              <h4 className="mt-2 text-lg font-black text-white">{noAtivo.label}</h4>
              <p className="mt-1 text-xs text-slate-400">Tipo: {rotuloTipoNo(noAtivo.type)}</p>
              {noAtivo.cnpjBasico && (
                <p className="mt-1 text-xs text-cyan-300">CNPJ básico: {noAtivo.cnpjBasico}</p>
              )}

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Conexões diretas</p>
                {arestasDoNo.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {arestasDoNo.map((edge) => {
                      const outroNoId = edge.from === noAtivo.id ? edge.to : edge.from;
                      const outroNo = nodes.find((node) => node.id === outroNoId);
                      return (
                        <li key={chaveAresta(edge)} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${classificationBadgeClass(edge.classification)}`}>
                              {edge.classification}
                            </span>
                            <span className="text-[10px] text-slate-400">Confiança {edge.evidence.confidence}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-200">
                            {edge.relationType} → {outroNo?.label ?? outroNoId}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{edge.evidence.explanation}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Sem conexões visíveis.</p>
                )}
              </div>

              {noAtivo.type === "company" && noAtivo.cnpjBasico && noAtivo.cnpjBasico !== targetCompany.cnpjBasico && (
                <button
                  onClick={() => {
                    const empresa = empresaDoNo(noAtivo);
                    if (empresa) onAbrirEmpresaReceita(empresa);
                  }}
                  className="mt-4 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20"
                >
                  Investigar esta empresa
                </button>
              )}
            </div>
          )}

          {arestaAtiva && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Detalhe da conexão</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${classificationBadgeClass(arestaAtiva.classification)}`}>
                  {arestaAtiva.classification}
                </span>
                <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${confidenceBadgeClass(arestaAtiva.evidence.confidence)}`}>
                  Confiança {arestaAtiva.evidence.confidence}
                </span>
              </div>
              {(() => {
                const relacao = relationDaAresta(arestaAtiva);
                const entityConfidence = relacao?.entityConfidence;
                const showHomonymAlert =
                  arestaAtiva.relationType === "same_partner" &&
                  entityConfidence &&
                  (entityConfidence.level === "LOW" || entityConfidence.level === "MEDIUM");

                return (
                  <>
                    {entityConfidence && (
                      <span className={`mt-2 inline-block rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${confidenceBadgeClass(entityConfidence.level)}`}>
                        Entidade {entityConfidence.level}
                      </span>
                    )}
                    {showHomonymAlert && (
                      <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-100">
                        Esta relação pode conter homônimos
                      </p>
                    )}
                    {entityConfidence && entityConfidence.reasons.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-400">
                        {entityConfidence.reasons.map((reason, index) => (
                          <li key={`${reason}-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </>
                );
              })()}
              <p className="mt-3 text-sm font-bold text-white">{arestaAtiva.relationType}</p>
              <p className="mt-1 text-xs text-slate-400">{arestaAtiva.label}</p>

              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <p><span className="font-bold text-slate-100">Campo:</span> {arestaAtiva.evidence.field}</p>
                <p><span className="font-bold text-slate-100">Valor:</span> {arestaAtiva.evidence.value || "Não informado"}</p>
                <p><span className="font-bold text-slate-100">Explicação:</span> {arestaAtiva.evidence.explanation}</p>
                <p><span className="font-bold text-slate-100">Fonte:</span> {arestaAtiva.evidence.source}</p>
              </div>

              <p className="mt-4 text-[10px] leading-5 text-slate-500">
                A força desta relação decorre destas evidências e possui as limitações exibidas no bloco de força das evidências.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function chaveAresta(edge: InvestigationGraphEdge): string {
  return `${edge.from}|${edge.to}|${edge.relationType}|${edge.label}`;
}

function rotuloTipoNo(type: InvestigationGraphNode["type"]): string {
  if (type === "company") return "empresa";
  if (type === "partner") return "sócio";
  if (type === "address") return "endereço";
  if (type === "phone") return "telefone";
  return "e-mail";
}

function classificationBadgeClass(classification: EvidenceClassification): string {
  if (classification === "DECLARADO") return "border-cyan-500/30 bg-cyan-500/15 text-cyan-100";
  if (classification === "INFERIDO") return "border-amber-500/30 bg-amber-500/15 text-amber-100";
  if (classification === "VALIDADO") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-100";
  return "border-violet-500/30 bg-violet-500/15 text-violet-100";
}

function classificationNodeClass(classification: EvidenceClassification): string {
  if (classification === "DECLARADO") return "border-cyan-500/40 bg-cyan-500/10 text-cyan-100";
  if (classification === "INFERIDO") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  if (classification === "VALIDADO") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  return "border-violet-500/40 bg-violet-500/10 text-violet-100";
}

function classificationEdgeClass(classification: EvidenceClassification): string {
  return classificationNodeClass(classification);
}

function ComparacaoEmpresas({
  empresas,
  onRemover,
}: {
  empresas: NormalizedCompany[];
  onRemover: (cnpj: string) => void;
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
      <table className="w-full min-w-[760px] border-collapse bg-slate-950 text-sm">
        <thead>
          <tr>
            <th className="border-b border-slate-800 p-4 text-left text-xs uppercase tracking-widest text-slate-500">
              Campo
            </th>
            {empresas.map((empresa) => (
              <th key={empresa.cnpj} className="border-b border-slate-800 p-4 text-left align-top">
                <p className="font-black text-white">{empresa.razaoSocial || empresa.cnpj || "Empresa"}</p>
                <button
                  onClick={() => onRemover(empresa.cnpj)}
                  className="mt-2 text-xs font-bold text-red-300 hover:text-red-200"
                >
                  Remover
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAMPOS_COMPARACAO.map((campo) => (
            <tr key={campo.id}>
              <td className="border-t border-slate-800 p-4 font-bold text-slate-400">{campo.label}</td>
              {empresas.map((empresa) => (
                <td key={`${empresa.cnpj}-${campo.id}`} className="border-t border-slate-800 p-4 text-slate-100">
                  {valorComparacao(empresa, campo)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmpresasRelacionadas({
  empresas,
  onAbrir,
}: {
  empresas: EmpresaRelacionadaLocal[];
  onAbrir: (empresa: NormalizedCompany) => void;
}) {
  return (
    <div className="mt-6 border-t border-slate-800 pt-5">
      <h3 className="text-xl font-black text-white">Empresas relacionadas</h3>
      <p className="mt-1 text-sm text-slate-400">
        Relações locais detectadas no histórico e favoritos por score de similaridade.
      </p>

      {empresas.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {empresas.map(({ company: empresa, motivos, score }) => (
            <div key={empresa.cnpj} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="font-bold text-white">{empresa.razaoSocial || empresa.cnpj || DADO_INDISPONIVEL_COMPARACAO}</p>
              <p className="mt-1 text-xs text-slate-400">{empresa.cnpj || DADO_INDISPONIVEL_COMPARACAO}</p>
              <p className="mt-3 text-sm font-black text-cyan-300">Score: {score}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                {motivos.join(" · ")}
              </p>
              <button
                onClick={() => onAbrir(empresa)}
                className="mt-4 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
              >
                Abrir empresa
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          Nenhuma relação encontrada na base local.
        </div>
      )}
    </div>
  );
}

function BotaoCopiar({
  campo,
  valor,
  label,
  copiadoCampo,
  onCopiar,
}: {
  campo: string;
  valor: string;
  label: string;
  copiadoCampo: string;
  onCopiar: (v: string, c: string) => void;
}) {
  return (
    <button
      onClick={() => onCopiar(valor, campo)}
      disabled={!valor}
      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
    >
      {copiadoCampo === campo ? "Copiado" : label}
    </button>
  );
}

function PainelLateral({
  titulo,
  subtitulo,
  itens,
  cnpjAtivo,
  onSelecionar,
  onLimpar,
}: {
  titulo: string;
  subtitulo: string;
  itens: HistoricoItem[];
  cnpjAtivo: string;
  onSelecionar: (item: HistoricoItem) => void;
  onLimpar: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitulo}</p>
        </div>
        <button
          onClick={onLimpar}
          className="text-xs font-bold text-red-300 hover:text-red-200"
        >
          Limpar
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {itens.map((item, index) => (
          <button
            key={`${item.company.cnpj}-${index}`}
            onClick={() => onSelecionar(item)}
            className={`w-full rounded-2xl border p-4 text-left transition-colors ${
              item.company.cnpj === cnpjAtivo
                ? "border-cyan-500 bg-slate-950"
                : "border-slate-800 bg-slate-950 hover:border-cyan-500"
            }`}
          >
            <p className="font-bold text-white">
              {item.company.razaoSocial || "Sem razão social"}
            </p>
            <p className="mt-1 text-xs text-slate-400">{item.company.cnpj}</p>
            <p className="mt-1 text-xs text-cyan-300">{item.company.provider}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{titulo}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-100">
        {valor || "Não informado"}
      </p>
    </div>
  );
}

function ListaAdicional({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{titulo}</p>
      {itens.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {itens.map((item, index) => (
            <li key={`${titulo}-${index}`} className="break-words text-sm font-bold leading-6 text-slate-100">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{DADO_INDISPONIVEL}</p>
      )}
    </div>
  );
}

function IndicadorAdicional({ label, valor }: { label: string; valor: string }) {
  const disponivel = Boolean(valor);
  const ativo = valor === "Sim";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-black leading-6 ${ativo ? "text-emerald-300" : "text-slate-400"}`}>
        {disponivel ? `${ativo ? "✓" : "—"} ${valor}` : DADO_INDISPONIVEL}
      </p>
    </div>
  );
}

function Badge({ texto }: { texto: string }) {
  return (
    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase text-cyan-200">
      {texto}
    </span>
  );
}

function Skeleton() {
  return (
    <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-56 rounded bg-slate-800" />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-24 rounded-2xl bg-slate-800" />
          <div className="h-24 rounded-2xl bg-slate-800" />
          <div className="h-24 rounded-2xl bg-slate-800" />
          <div className="h-24 rounded-2xl bg-slate-800" />
        </div>
      </div>
    </section>
  );
}

function JsonTree({
  valor,
  nome,
  raiz = false,
  expandido = false,
}: {
  valor: JsonValue;
  nome?: string;
  raiz?: boolean;
  expandido?: boolean;
}) {
  if (Array.isArray(valor)) {
    return (
      <details
        open={raiz || expandido}
        className="mb-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"
      >
        <summary className="cursor-pointer font-bold text-cyan-200">
          {nome || "Lista"} · {valor.length} item(ns)
        </summary>
        <div className="mt-4 space-y-3 border-l border-slate-800 pl-4">
          {valor.length === 0 ? (
            <p className="text-sm text-slate-500">Lista vazia</p>
          ) : (
            valor.map((item, index) => (
              <JsonTree
                key={index}
                nome={`Item ${index + 1}`}
                valor={item}
                expandido={expandido}
              />
            ))
          )}
        </div>
      </details>
    );
  }

  if (isObject(valor)) {
    const entradas = Object.entries(valor);

    if (raiz) {
      return (
        <div className="space-y-3">
          {entradas.map(([chave, item]) => (
            <JsonTree key={chave} nome={chave} valor={item} expandido={expandido} />
          ))}
        </div>
      );
    }

    return (
      <details
        open={expandido}
        className="mb-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"
      >
        <summary className="cursor-pointer font-bold text-cyan-200">
          {humanizar(nome || "Objeto")} · {entradas.length} campo(s)
        </summary>
        <div className="mt-4 space-y-3 border-l border-slate-800 pl-4">
          {entradas.length === 0 ? (
            <p className="text-sm text-slate-500">Objeto vazio</p>
          ) : (
            entradas.map(([chave, item]) => (
              <JsonTree key={chave} nome={chave} valor={item} expandido={expandido} />
            ))
          )}
        </div>
      </details>
    );
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[240px_1fr]">
      <p className="text-sm font-bold text-slate-400">{humanizar(nome || "Valor")}</p>
      <p className="break-words text-sm font-semibold text-slate-100">
        {formatarValor(nome || "", valor)}
      </p>
    </div>
  );
}

// ——— Helpers ———

function isObject(valor: unknown): valor is JsonObject {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function formatarValor(chave: string, valor: JsonValue): string {
  if (valor === null || valor === "") return "Não informado";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "number") return new Intl.NumberFormat("pt-BR").format(valor);
  if (typeof valor !== "string") return String(valor);

  const chaveNorm = chave.toLowerCase();
  const txt = valor.trim();

  if (!txt) return "Não informado";
  if (chaveNorm.includes("cnpj") || chaveNorm.includes("taxid")) return formatarCnpj(txt);
  if (chaveNorm.includes("cep") || chaveNorm.includes("zip")) return formatarCep(txt);
  if (chaveNorm.includes("capital") || chaveNorm.includes("equity")) return formatarMoeda(txt);
  if (/^\d{4}-\d{2}-\d{2}/.test(txt)) return formatarData(txt);

  return txt;
}

function contarCamposPreenchidos(valor: JsonValue): number {
  if (valor === null || valor === "") return 0;
  if (typeof valor === "string") return valor.trim() ? 1 : 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? 1 : 0;
  if (typeof valor === "boolean") return 1;

  if (Array.isArray(valor)) {
    return valor.reduce<number>((total, item) => total + contarCamposPreenchidos(item), 0);
  }

  return Object.values(valor).reduce<number>((total, item) => total + contarCamposPreenchidos(item), 0);
}

function filtrarJson(valor: JsonValue, filtro: string): JsonValue | null {
  if (valor === null) return null;

  if (typeof valor !== "object") {
    return String(valor).toLowerCase().includes(filtro) ? valor : null;
  }

  if (Array.isArray(valor)) {
    const lista = valor
      .map((item) => filtrarJson(item, filtro))
      .filter((item): item is JsonValue => item !== null);
    return lista.length ? lista : null;
  }

  const resultado: JsonObject = {};

  for (const [chave, item] of Object.entries(valor)) {
    const chaveCombina = chave.toLowerCase().includes(filtro);
    const itemFiltrado = filtrarJson(item, filtro);
    if (chaveCombina) resultado[chave] = item;
    else if (itemFiltrado !== null) resultado[chave] = itemFiltrado;
  }

  return Object.keys(resultado).length ? resultado : null;
}
// EOF
