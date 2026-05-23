const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = apiUrl(path);
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `Não foi possível conectar à API em ${API_URL}. Verifique se o backend está rodando e se o CORS permite este frontend.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Erro ao consultar API (${response.status}) em ${url}`);
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = apiUrl(path);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Não foi possível conectar à API em ${API_URL}. Verifique se o backend está rodando e se o CORS permite este frontend.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Erro ao consultar API (${response.status}) em ${url}`);
  }

  return response.json();
}

export async function apiDelete(path: string): Promise<void> {
  const url = apiUrl(path);
  let response: Response;

  try {
    response = await fetch(url, { method: "DELETE" });
  } catch (error) {
    throw new Error(
      `Não foi possível conectar à API em ${API_URL}. Verifique se o backend está rodando e se o CORS permite este frontend.`,
      { cause: error },
    );
  }

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Erro ao consultar API (${response.status}) em ${url}`);
  }
}
