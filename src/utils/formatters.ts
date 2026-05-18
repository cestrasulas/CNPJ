// path: src/utils/formatters.ts

export function somenteNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function mascararCnpj(valor: string): string {
  const numeros = somenteNumeros(valor).slice(0, 14);

  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function validarCnpj(valor: string): boolean {
  const cnpj = somenteNumeros(valor);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calcular = (base: string) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const soma = base
      .split("")
      .reduce((total, digito, index) => total + Number(digito) * pesos[index], 0);

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcular(cnpj.slice(0, 12));
  const segundo = calcular(cnpj.slice(0, 12) + primeiro);

  return cnpj.endsWith(`${primeiro}${segundo}`);
}

export function formatarCnpj(valor: string): string {
  const numeros = somenteNumeros(valor);

  if (numeros.length !== 14) return valor || "";

  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(
    5,
    8,
  )}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
}

export function formatarCep(valor: string): string {
  const numeros = somenteNumeros(valor);

  if (numeros.length !== 8) return valor;

  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
}

export function formatarMoeda(valor: string): string {
  const numero = Number(String(valor || "").replace(",", "."));

  if (!Number.isFinite(numero)) return valor || "Não informado";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

export function formatarData(valor: string): string {
  if (!valor) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const data = new Date(valor);

    if (!Number.isNaN(data.getTime())) {
      return new Intl.DateTimeFormat("pt-BR").format(data);
    }
  }

  return valor;
}

export function humanizar(chave: string): string {
  return chave.replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
}
// EOF