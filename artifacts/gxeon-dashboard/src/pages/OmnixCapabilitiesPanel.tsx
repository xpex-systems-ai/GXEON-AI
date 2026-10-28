import { useEffect, useRef, useState } from "react";
import {
  auditWorkflowReportSchema,
  omnixAuditIdArgumentsSchema,
  omnixCapabilityRegistrySchema,
  omnixConversationSchema,
  type OmnixCapabilityRegistry,
  type OmnixCases,
  type OmnixConversationInput,
} from "@workspace/api-zod";
import { readAuditJson } from "@/services/auditTransport";

const labels = {
  PLANNED: "Planejado",
  IMPLEMENTED: "Implementado",
  TESTED: "Testado",
  RELEASE_BLOCKED: "Liberação bloqueada",
  AVAILABLE: "Disponível",
  DEPRECATED: "Descontinuado",
};
const environmentLabels = {
  SYNTHETIC_TEST_ONLY: "Somente testes sintéticos",
  UNAVAILABLE: "Indisponível",
  NOT_VERIFIED: "Não verificado",
  BLOCKED: "Bloqueado",
};
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function invalidContract(): never {
  throw new Error("DISTRIBUTION_INVALID_CONTRACT");
}
function catalogResponse(value: unknown) {
  if (!record(value) || value.ok !== true || value.tool !== "omnix_get_capabilities" || value.engine !== "gx01-v1") invalidContract();
  return omnixCapabilityRegistrySchema.parse(value.data);
}
function assistantResponse(value: unknown, intent: OmnixConversationInput["intent"]) {
  if (!record(value) || value.mode !== "STRUCTURED_READ_ONLY" || value.languageModelUsed !== false || value.writesAllowed !== false) invalidContract();
  const observation = value.observation;
  let summary: string;
  if (intent === "latest_report" && value.report === null) {
    if (typeof value.truncated !== "boolean") invalidContract();
    summary = value.truncated
      ? "Nenhum relatório concluído nos 50 casos autorizados mais recentes. Casos anteriores não foram consultados."
      : "Nenhum relatório concluído no histórico autorizado desta sessão.";
  } else {
    if (!record(observation) || observation.ok !== true || observation.engine !== "gx01-v1") invalidContract();
    if (intent === "capabilities") {
      const catalog = catalogResponse(observation);
      summary = `${catalog.specialists.length} especialistas declarados. Liberação: ${labels[catalog.release.status]}.`;
    } else if (intent === "latest_report") {
      if (observation.tool !== "omnix_get_report") invalidContract();
      auditWorkflowReportSchema.parse(observation.data);
      summary = "Relatório canônico consultado. O conteúdo abaixo preserva as referências às evidências.";
    } else {
      if (observation.tool !== "omnix_get_findings" || !record(observation.data)) invalidContract();
      const data = observation.data;
      if (!omnixAuditIdArgumentsSchema.safeParse({ caseId: data.caseId }).success || !Array.isArray(data.findings) || data.findings.length > 2 ||
          !data.findings.every(f => record(f) && typeof f.id === "string" && typeof f.title === "string" && typeof f.summary === "string" &&
            typeof f.recommendation === "string" && Array.isArray(f.evidenceIds) && f.evidenceIds.length === 1 && typeof f.evidenceIds[0] === "string")) invalidContract();
      summary = data.findings.length
        ? `${data.findings.length} achado(s) registrado(s) para o caso consultado. As referências aparecem no conteúdo.`
        : "Nenhum achado registrado para o caso consultado. Isso não certifica a segurança do ativo.";
    }
  }
  const payload = JSON.stringify(value, null, 2);
  if (payload.length > 262144) invalidContract();
  return { summary, payload };
}
function guidance(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("HTTP 401")) return "A sessão expirou. Saia e entre novamente com sua identidade de teste.";
  if (message.includes("HTTP 403")) return "Esta identidade não tem permissão para essa consulta. Confira o acesso com o responsável da prévia.";
  if (message.includes("HTTP 409")) return "A integridade ou o estado do registro não foi confirmado. A consulta não produziu um novo resultado.";
  if (message.includes("HTTP 404")) return "O recurso não está disponível no escopo autorizado desta sessão.";
  if (message.includes("HTTP 429")) return "O limite temporário de consultas foi atingido. Aguarde antes de tentar novamente.";
  if (message.includes("API_EXPECTED_JSON") || message.includes("INVALID_CONTRACT") || message.includes("API_INVALID_JSON"))
    return "O backend não retornou o contrato esperado. Nenhuma capacidade ou evidência foi confirmada por essa resposta.";
  return "Não foi possível confirmar a consulta. Verifique a disponibilidade do backend e tente novamente.";
}
async function request(path: "capabilities" | "assistant", controller: AbortController, body?: OmnixConversationInput) {
  const response = await fetch(`/api/omnix/distribution/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(omnixConversationSchema.parse(body)) }),
  });
  return readAuditJson(response);
}

/** Parent keys this panel by organization, user and session expiry. Unmounting
 * aborts reads and discards pending responses on navigation or logout. */
export default function OmnixCapabilitiesPanel({ cases }: { cases?: OmnixCases }) {
  const [catalog, setCatalog] = useState<OmnixCapabilityRegistry>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [caseId, setCaseId] = useState("");
  const [consulting, setConsulting] = useState(false);
  const [consultationError, setConsultationError] = useState("");
  const [result, setResult] = useState<{ summary: string; payload: string }>();
  const assistantController = useRef<AbortController | undefined>(undefined);
  const selectedCaseId = cases?.items.some(item => item.id === caseId) ? caseId : cases?.items[0]?.id ?? "";
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true); setError(""); setCatalog(undefined);
    void request("capabilities", controller).then(value => {
      const parsed = catalogResponse(value);
      if (current && !controller.signal.aborted) setCatalog(parsed);
    }).catch(error => {
      if (current && !controller.signal.aborted) setError(guidance(error));
    }).finally(() => {
      if (current && !controller.signal.aborted) setLoading(false);
    });
    return () => { current = false; controller.abort(); assistantController.current?.abort(); };
  }, [refresh]);
  async function consult(input: OmnixConversationInput) {
    assistantController.current?.abort();
    const controller = new AbortController(); assistantController.current = controller;
    setConsulting(true); setConsultationError(""); setResult(undefined);
    try {
      const value = assistantResponse(await request("assistant", controller, input), input.intent);
      if (!controller.signal.aborted && assistantController.current === controller) setResult(value);
    } catch (error) {
      if (!controller.signal.aborted && assistantController.current === controller) setConsultationError(guidance(error));
    } finally {
      if (!controller.signal.aborted && assistantController.current === controller) setConsulting(false);
    }
  }
  return (
    <section aria-labelledby="omnix-capabilities-heading">
      <p className="ox-kicker">CAPACIDADES / CONSULTA AUTORIZADA</p>
      <h1 id="omnix-capabilities-heading">O que o motor comprova.</h1>
      <p className="ox-lead">Catálogo declarado pelo backend desta sessão. Estados, limites e pendências acompanham cada especialista.</p>
      <div className="ox-actions">
        <button type="button" disabled={loading || consulting} onClick={() => setRefresh(value => value + 1)}>Atualizar catálogo</button>
        <span className="ox-muted">Prévia sintética · GXEON Audit OS · sem dados de clientes</span>
      </div>
      {loading ? <p className="ox-progress" role="status">Consultando o catálogo autorizado…</p> : null}
      {error ? <p className="ox-error" role="alert">{error}</p> : null}
      {!loading && !error && !catalog ? <p className="ox-empty">Nenhum catálogo foi confirmado pelo backend.</p> : null}
      {catalog ? <>
        <section className="ox-card" aria-labelledby="omnix-release-heading">
          <h2 id="omnix-release-heading">Liberação: {labels[catalog.release.status]}</h2>
          <p>Motor {catalog.engine.id} · fluxo {catalog.engine.workflowVersion} · catálogo {catalog.version}.</p>
          <ul>{catalog.release.gates.map(gate => <li key={gate}>{gate}</li>)}</ul>
          <p className="ox-muted">Publicação MCP externa e abertura para dados de clientes permanecem bloqueadas.</p>
        </section>
        {catalog.specialists.map(specialist => <article className="ox-card" key={specialist.id}>
          <div className="ox-section-heading"><h2>{specialist.name}</h2><span className="ox-pill">{specialist.status}</span></div>
          <p>{labels[specialist.status]} · {specialist.provider} · versão {specialist.version}</p>
          <ul>{specialist.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
          <details>
            <summary>Regras, permissões e ambientes</summary>
            <p>Regras: {specialist.rules.length ? specialist.rules.join(", ") : "Nenhuma regra implementada neste especialista."}</p>
            <p>Permissões declaradas: {specialist.permissions.length ? specialist.permissions.join(", ") : "Nenhuma conexão ativa."}</p>
            <p>Local: {environmentLabels[specialist.environmentAvailability.local]}. CI: {environmentLabels[specialist.environmentAvailability.ci]}. Remoto protegido: {environmentLabels[specialist.environmentAvailability.protectedRemote]}. Produção: {environmentLabels[specialist.environmentAvailability.production]}.</p>
            <p>Dependências: {specialist.dependencies.join(" ")}</p>
            <p>Evidências previstas ou produzidas: {specialist.evidenceProduced.join(" ")}</p>
          </details>
        </article>)}
      </> : null}
      <section className="ox-card" aria-labelledby="omnix-consultation-heading" aria-busy={consulting}>
        <h2 id="omnix-consultation-heading">Consultar registros desta sessão</h2>
        <p>Escolha uma consulta estruturada aos registros existentes. O acesso é validado pelo servidor em cada solicitação.</p>
        <div className="ox-actions">
          <button type="button" disabled={loading || consulting} onClick={() => void consult({ intent: "capabilities" })}>Consultar capacidades</button>
          <button type="button" disabled={consulting} onClick={() => void consult({ intent: "latest_report" })}>Último relatório autorizado</button>
        </div>
        <label>Casos do histórico autorizado
          <select className="ox-code" style={{ width: "100%", minWidth: 0, maxWidth: "100%" }} value={selectedCaseId} disabled={consulting || !selectedCaseId} onChange={event => setCaseId(event.target.value)}>
            {!selectedCaseId ? <option value="">Nenhum caso disponível</option> : null}
            {cases?.items.map(item => <option value={item.id} key={item.id}>{item.title} · {item.id}</option>)}
          </select>
        </label>
        <button type="button" disabled={consulting || !selectedCaseId} onClick={() => void consult({ intent: "findings", caseId: selectedCaseId })}>Consultar achados do caso</button>
        {!selectedCaseId ? <p className="ox-muted">Crie um caso sintético ou atualize o histórico para disponibilizar uma consulta de achados.</p> : null}
        {consulting ? <p className="ox-progress" role="status">Consultando registros canônicos…</p> : null}
        {consultationError ? <p className="ox-error" role="alert">{consultationError}</p> : null}
        {result ? <div><p role="status">{result.summary}</p><details><summary>Conteúdo e referências da resposta</summary><pre className="ox-code">{result.payload}</pre></details></div> : null}
        <p className="ox-muted">Consulta sem modelo de linguagem. O conteúdo de artefatos é exibido como dado; aprovações e mudanças exigem o fluxo de revisão existente.</p>
      </section>
    </section>
  );
}
