import { useState } from "react";
import { z } from "zod";
import {
  auditWorkflowActionSchema as actionSchema,
  auditWorkflowDetailSchema,
  auditWorkflowReportSchema,
  type AuditWorkflowDetail,
} from "@workspace/api-zod";
import { apiUrl, getApiBaseDiagnostic } from "@/services/apiBase";
import { readAuditJson } from "@/services/auditTransport";

const sample = JSON.stringify(
  {
    framework: "vite",
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  },
  null,
  2,
);
const field =
  "w-full rounded border border-slate-600 bg-slate-950 p-2 text-white";

export default function AuditWorkflowPage() {
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [token, setToken] = useState("");
  const [role, setRole] = useState<"operator" | "reviewer">("operator");
  const [assetName, setAssetName] = useState("");
  const [assetReference, setAssetReference] = useState("");
  const [authorizationReference, setAuthorizationReference] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [testData, setTestData] = useState(true);
  const [content, setContent] = useState("");
  const [caseId, setCaseId] = useState("");
  const [detail, setDetail] = useState<AuditWorkflowDetail>();
  const [reviewReference, setReviewReference] = useState("");
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function request(path: string, body?: unknown) {
    return readAuditJson(
      await fetch(apiUrl(`/api/v1/audit/workflow${path}`), {
        method: body === undefined ? "GET" : "POST",
        cache: "no-store",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(15000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  }
  async function load(id: string) {
    setDetail(auditWorkflowDetailSchema.parse(await request(`/cases/${id}`)));
  }
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function transition(
    name: "run" | "review" | "finalize",
    body: unknown = {},
  ) {
    await perform(async () => {
      actionSchema.parse(await request(`/cases/${caseId}/${name}`, body));
      await load(caseId);
      setMessage("Estado confirmado pela API.");
    });
  }
  const validId = z.string().uuid().safeParse(caseId).success;
  return (
    <main
      translate="no"
      className="mx-auto max-w-5xl space-y-6 p-6 text-slate-100"
    >
      <header>
        <a href="/ops/audit-os" className="text-cyan-300 underline">
          Audit OS
        </a>
        <h1 className="text-2xl font-semibold">
          Auditoria de configuração · GX-01
        </h1>
        <p>
          Inspeção estática de vercel.json enviado pelo operador. Cada resultado
          referencia a configuração recebida. O ambiente publicado exige
          validação separada.
        </p>
        <p className="text-sm text-slate-400">API: {getApiBaseDiagnostic()}</p>
      </header>
      <section
        className="space-y-3 rounded border border-slate-700 p-4"
        aria-label="Acesso"
      >
        <label className="block">
          Papel da credencial
          <select
            className={field}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as typeof role);
              setToken("");
              setDetail(undefined);
            }}
          >
            <option value="operator">Operador</option>
            <option value="reviewer">Revisor independente</option>
          </select>
        </label>
        <label className="block">
          Token do papel selecionado
          <input
            className={field}
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        <p className="text-sm">
          Credencial mantida somente nesta página. A aprovação exige token de
          revisor distinto e atestado de revisão humana.
        </p>
      </section>
      <form
        className="space-y-3 rounded border border-slate-700 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            const result = actionSchema.parse(
              await request("/cases", {
                requestId,
                assetName,
                assetReference,
                authorizationReference,
                authorized,
                testData,
                checks: ["vercel_api_routing", "vercel_security_headers"],
                artifact: { name: "vercel.json", content },
              }),
            );
            setCaseId(result.caseId);
            setRequestId(crypto.randomUUID());
            await load(result.caseId);
            setMessage("Solicitação e evidência persistidas.");
          });
        }}
      >
        <h2 className="text-xl">1. Registrar escopo autorizado</h2>
        <label className="block">
          Nome do ativo
          <input
            required
            maxLength={180}
            className={field}
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
          />
        </label>
        <label className="block">
          Referência do ativo (sem credenciais ou query)
          <input
            required
            maxLength={500}
            className={field}
            value={assetReference}
            onChange={(e) => setAssetReference(e.target.value)}
          />
        </label>
        <label className="block">
          Referência da autorização
          <input
            required
            maxLength={500}
            className={field}
            value={authorizationReference}
            onChange={(e) => setAuthorizationReference(e.target.value)}
          />
        </label>
        <label className="block">
          vercel.json redigido
          <textarea
            required
            className={`${field} min-h-48 font-mono text-sm`}
            maxLength={16000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <p>
          Verificações selecionadas: conflito específico de fallback SPA/API e
          declarações globais de CSP e X-Content-Type-Options.
        </p>
        <label className="block">
          <input
            type="checkbox"
            checked={testData}
            onChange={(e) => setTestData(e.target.checked)}
          />{" "}
          Dados de teste identificados no caso e relatório
        </label>
        <label className="block">
          <input
            required
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
          />{" "}
          Tenho autorização para analisar este ativo e fornecer este arquivo.
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy || !token || role !== "operator" || !authorized}
            className="rounded bg-cyan-800 p-2 disabled:opacity-40"
          >
            Registrar solicitação
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border p-2"
            onClick={() => {
              setAssetName("TEST DATA · configuração de exemplo");
              setAssetReference("test-fixture/vercel.json");
              setAuthorizationReference("test-fixture/authorized-scope");
              setContent(sample);
              setTestData(true);
              setAuthorized(false);
            }}
          >
            Preencher exemplo de teste
          </button>
        </div>
      </form>
      <section className="space-y-3 rounded border border-slate-700 p-4">
        <h2 className="text-xl">2. Executar e revisar caso</h2>
        <label className="block">
          ID do caso
          <input
            className={field}
            value={caseId}
            onChange={(e) => {
              setCaseId(e.target.value);
              setDetail(undefined);
            }}
          />
        </label>
        <button
          disabled={busy || !token || !validId}
          onClick={() => void perform(() => load(caseId))}
          className="rounded border p-2 disabled:opacity-40"
        >
          Carregar caso
        </button>
        {detail ? (
          <>
            <p>
              Estado: <strong>{detail.item.status}</strong> ·{" "}
              {detail.item.title}
            </p>
            <p>
              {detail.evidences.length} evidência(s), {detail.findings.length}{" "}
              achado(s), {detail.reports.length} relatório(s).
            </p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs">
              {JSON.stringify(
                {
                  scope: detail.item.metadata.scope,
                  results: detail.item.metadata.results,
                  evidences: detail.evidences,
                  findings: detail.findings,
                  review: detail.item.metadata.review,
                },
                null,
                2,
              )}
            </pre>
          </>
        ) : (
          <p>
            Nenhum caso carregado. Informe um ID persistido ou registre uma
            solicitação.
          </p>
        )}
        <button
          className="rounded bg-cyan-800 p-2 disabled:opacity-40"
          disabled={
            busy ||
            !token ||
            role !== "operator" ||
            detail?.item.status !== "DRAFT"
          }
          onClick={() => void transition("run")}
        >
          Executar verificações delimitadas
        </button>
        <label className="block">
          Referência da revisão humana
          <input
            className={field}
            maxLength={500}
            value={reviewReference}
            onChange={(e) => setReviewReference(e.target.value)}
          />
        </label>
        <label className="block">
          <input
            type="checkbox"
            checked={humanReviewed}
            onChange={(e) => setHumanReviewed(e.target.checked)}
          />{" "}
          Revisei o escopo, as evidências, os achados e as limitações.
        </label>
        <div className="flex gap-3">
          {(["approve", "reject"] as const).map((decision) => (
            <button
              key={decision}
              className="rounded border p-2 disabled:opacity-40"
              disabled={
                busy ||
                !token ||
                role !== "reviewer" ||
                !humanReviewed ||
                reviewReference.trim().length < 3 ||
                detail?.item.status !== "IN_REVIEW"
              }
              onClick={() =>
                void transition("review", {
                  decision,
                  humanReviewed,
                  reviewReference,
                })
              }
            >
              {decision === "approve" ? "Aprovar revisão" : "Rejeitar revisão"}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded border border-slate-700 p-4">
        <h2 className="text-xl">3. Finalizar e exportar</h2>
        <button
          className="rounded bg-cyan-800 p-2 disabled:opacity-40"
          disabled={
            busy ||
            !token ||
            role !== "operator" ||
            detail?.item.status !== "READY_FOR_REPORT"
          }
          onClick={() => void transition("finalize")}
        >
          Gerar relatório e fechar caso
        </button>
        <button
          className="ml-3 rounded border p-2 disabled:opacity-40"
          disabled={busy || !token || detail?.item.status !== "CLOSED"}
          onClick={() =>
            void perform(async () => {
              const report = auditWorkflowReportSchema.parse(
                await request(`/cases/${caseId}/report`),
              );
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(report, null, 2)], {
                  type: "application/json",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = `audit-${caseId}.json`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage("Relatório exportado com referências às evidências.");
            })
          }
        >
          Exportar JSON
        </button>
      </section>
      {busy && <p role="status">Aguardando confirmação da API…</p>}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="rounded border border-red-500 p-3">
          {error}
        </p>
      )}
    </main>
  );
}
