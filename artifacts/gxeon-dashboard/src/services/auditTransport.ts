export async function readAuditJson(response: Response): Promise<unknown> {
  if (
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new Error(
      "API_EXPECTED_JSON: confira o endereço do backend; a resposta não é JSON.",
    );
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("API_INVALID_JSON: resposta inválida do backend.");
  }
  if (!response.ok) {
    const code =
      payload &&
      typeof payload === "object" &&
      "code" in payload &&
      typeof payload.code === "string" &&
      /^[A-Z0-9_]+$/.test(payload.code)
        ? payload.code
        : "API_ERROR";
    throw new Error(
      `${code} (HTTP ${response.status}). Verifique a credencial, o escopo e a disponibilidade da API.`,
    );
  }
  return payload;
}
