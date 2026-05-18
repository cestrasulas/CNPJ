export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(input: string): boolean {
  const cnpj = onlyDigits(input);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);

    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digit1 === Number(cnpj[12]) && digit2 === Number(cnpj[13]);
}

export function normalizePhone(value: string): string {
  return onlyDigits(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
