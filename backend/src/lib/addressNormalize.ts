const ADDRESS_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\br\.\s*/i, "rua "],
  [/\brua\b/i, "rua"],
  [/\bav\.\s*/i, "avenida "],
  [/\bavenida\b/i, "avenida"],
  [/\best\.\s*/i, "estrada "],
  [/\bestrada\b/i, "estrada"],
  [/\btrav\.\s*/i, "travessa "],
  [/\btravessa\b/i, "travessa"],
  [/\bal\.\s*/i, "alameda "],
  [/\balameda\b/i, "alameda"],
];

export function normalizeAddressQuery(q: string): string {
  let normalized = q.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [pattern, replacement] of ADDRESS_ABBREVIATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.replace(/\s+/g, " ").trim();
}

export function looksLikeCep(q: string): boolean {
  const trimmed = q.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 8) return false;
  if (trimmed.includes("-")) return true;
  return digits.startsWith("0");
}

export function normalizeCep(q: string): string {
  return q.replace(/\D/g, "").slice(0, 8);
}
