/**
 * Nomes com alta frequência na base Receita local.
 * Match só por nome nesses casos tem alto risco de homônimo — ver ER-005.
 */
export const ULTRA_FREQUENT_PARTNER_NAMES = new Set([
  "JOSE CARLOS DA SILVA",
  "MARCOS ANTONIO DA SILVA",
  "MARIA APARECIDA DA SILVA",
  "ANA PAULA DA SILVA",
  "ANTONIO CARLOS DA SILVA",
  "JOSE CARLOS DOS SANTOS",
  "JOAO BATISTA DA SILVA",
  "JOSE ANTONIO DA SILVA",
  "ANDERSON COSTA REIS",
  "CELSO ANTONIO ALVES",
]);

export const ULTRA_FREQUENT_NAME_ONLY_CAP = 3;

export function isUltraFrequentPartnerName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ULTRA_FREQUENT_PARTNER_NAMES.has(name.trim().toUpperCase());
}
