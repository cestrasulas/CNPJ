import {
  listReceitaEstabelecimentosByCnpjBasico,
  listReceitaSociosByCnpjBasico,
} from "../repositories/receita.repository.js";
import {
  getLatestWatchSnapshot,
  insertWatchEvents,
  insertWatchSnapshot,
  type WatchDiffEventInput,
  type WatchMonitorSnapshot,
} from "../repositories/watchDiff.repository.js";
import {
  listInvestigationWatchesByCnpjBasico,
  updateInvestigationWatch,
  type InvestigationWatchRow,
} from "../repositories/watch.repository.js";

export type WatchDiffResult = {
  watchId: string;
  cnpjBasico: string;
  label: string | null;
  baseline: boolean;
  events: WatchDiffEventInput[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export async function captureWatchMonitorSnapshot(cnpjBasico: string): Promise<WatchMonitorSnapshot> {
  const [estabelecimentos, socios] = await Promise.all([
    listReceitaEstabelecimentosByCnpjBasico(cnpjBasico, 50),
    listReceitaSociosByCnpjBasico(cnpjBasico),
  ]);

  const partnerLabels: Record<string, string> = {};
  const partners = socios.map((socio) => {
    const nome = socio.nome_socio?.trim() || "Sócio sem nome";
    const documento = socio.cnpj_cpf_socio?.trim() || "documento não informado";
    const key = `${normalizeText(nome)}|${normalizeText(documento)}`;
    const qualificacao = socio.qualificacao_socio?.trim();
    partnerLabels[key] = qualificacao ? `${nome} (${documento}) — ${qualificacao}` : `${nome} (${documento})`;
    return key;
  });

  const phones = uniqueSorted(
    estabelecimentos.map((item) => item.telefone1_normalizado?.trim() ?? "").filter(Boolean),
  );

  const emails = uniqueSorted(
    estabelecimentos.map((item) => normalizeText(item.email)).filter(Boolean),
  );

  return {
    cnpjBasico,
    capturedAt: new Date().toISOString(),
    partners: uniqueSorted(partners),
    partnerLabels,
    phones,
    emails,
  };
}

function diffCategory(
  category: WatchDiffEventInput["category"],
  labelSingular: string,
  previous: string[],
  current: string[],
  describe: (value: string) => string,
): WatchDiffEventInput[] {
  const events: WatchDiffEventInput[] = [];
  const previousSet = new Set(previous);
  const currentSet = new Set(current);

  for (const value of current) {
    if (!previousSet.has(value)) {
      events.push({
        category,
        changeType: "added",
        description: `${labelSingular} adicionado: ${describe(value)}.`,
      });
    }
  }

  for (const value of previous) {
    if (!currentSet.has(value)) {
      events.push({
        category,
        changeType: "removed",
        description: `${labelSingular} removido: ${describe(value)}.`,
      });
    }
  }

  return events;
}

export function diffWatchSnapshots(
  previous: WatchMonitorSnapshot,
  current: WatchMonitorSnapshot,
): WatchDiffEventInput[] {
  return [
    ...diffCategory("partners", "Sócio declarado", previous.partners, current.partners, (value) =>
      current.partnerLabels[value] ?? previous.partnerLabels[value] ?? value,
    ),
    ...diffCategory("phones", "Telefone", previous.phones, current.phones, (value) => value),
    ...diffCategory("emails", "E-mail", previous.emails, current.emails, (value) => value),
  ];
}

async function processWatch(watch: InvestigationWatchRow): Promise<WatchDiffResult> {
  const current = await captureWatchMonitorSnapshot(watch.cnpj_basico);
  const previousRow = await getLatestWatchSnapshot(watch.id);

  if (!previousRow) {
    const baselineEvent: WatchDiffEventInput = {
      category: "partners",
      changeType: "baseline",
      description: `Baseline capturada: ${current.partners.length} sócio(s), ${current.phones.length} telefone(s), ${current.emails.length} e-mail(s) declarados na base local.`,
    };

    await insertWatchSnapshot(watch.id, current);
    await insertWatchEvents(watch.id, [baselineEvent]);
    await updateInvestigationWatch(watch.id, { lastCheckedAt: current.capturedAt });

    return {
      watchId: watch.id,
      cnpjBasico: watch.cnpj_basico,
      label: watch.label,
      baseline: true,
      events: [baselineEvent],
    };
  }

  const events = diffWatchSnapshots(previousRow.snapshot, current);

  await insertWatchSnapshot(watch.id, current);
  if (events.length > 0) {
    await insertWatchEvents(watch.id, events);
  }
  await updateInvestigationWatch(watch.id, { lastCheckedAt: current.capturedAt });

  return {
    watchId: watch.id,
    cnpjBasico: watch.cnpj_basico,
    label: watch.label,
    baseline: false,
    events,
  };
}

export async function runWatchDiffJob(options: { cnpjBasico?: string; limit?: number } = {}): Promise<WatchDiffResult[]> {
  const limit = options.limit ?? 20;
  const watches = (await listInvestigationWatchesByCnpjBasico(options.cnpjBasico)).slice(0, limit);

  const results: WatchDiffResult[] = [];
  for (const watch of watches) {
    results.push(await processWatch(watch));
  }

  return results;
}
