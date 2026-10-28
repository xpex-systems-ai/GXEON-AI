import { useEffect, useState, useRef } from "react";
import {
  auditWorkflowActionSchema,
  omnixDetailSchema,
  auditWorkflowIntakeSchema,
  auditWorkflowReportSchema,
  omnixCasesSchema,
  omnixSessionSchema,
  omnixStatusSchema,
  type OmnixDetail,
  type AuditWorkflowIntake,
  type OmnixCases,
  type OmnixSession,
} from "@workspace/api-zod";
import { readAuditJson } from "@/services/auditTransport";
import example from "@/data/omnix-example-report.json";
import OmnixCapabilitiesPanel from "./OmnixCapabilitiesPanel";
import "./omnix.css";

type View = "dashboard" | "new" | "result" | "history" | "example" | "capabilities";
const checkNames = {
  vercel_api_routing: "Fallback SPA e roteamento da API",
  vercel_security_headers: "Declarações globais de headers de segurança",
};
const states = {
  DRAFT: "Escopo registrado",
  IN_REVIEW: "Aguardando revisão",
  READY_FOR_REPORT: "Pronto para relatório",
  CLOSED: "Concluído",
};
const sample =
  '{\n  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]\n}';
function configObject(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "O arquivo não contém JSON válido. Confira a sintaxe antes de enviar.",
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("vercel.json deve conter um objeto JSON.");
  return value;
}
const date = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(v));

export default function OmnixPortalPage() {
  const [connection, setConnection] = useState<
    "checking" | "online" | "blocked"
  >("checking");
  const [session, setSession] = useState<OmnixSession>();
  const [cases, setCases] = useState<OmnixCases>();
  const [detail, setDetail] = useState<OmnixDetail>();
  const [view, setView] = useState<View>("dashboard");
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [synthetic, setSynthetic] = useState(false);
  const [checks, setChecks] = useState<AuditWorkflowIntake["checks"]>([
    "vercel_api_routing",
    "vercel_security_headers",
  ]);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [download, setDownload] = useState<{
    url: string;
    id: string;
    sha256: string;
  }>();
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download.url);
    },
    [download],
  );
  const sessionEpoch = useRef(0);
  const reset = () => {
    sessionEpoch.current++;
    setSession(undefined);
    setCases(undefined);
    setDetail(undefined);
    setDownload(undefined);
    setContent("");
    setCode("");
    setReview("");
    setReviewed(false);
  };
  async function request(path: string, body?: unknown) {
    const epoch = sessionEpoch.current;
    const response = await fetch(`/api/omnix${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (epoch !== sessionEpoch.current) {
      await response.body?.cancel();
      throw new Error(
        "A sessão mudou durante a consulta. Atualize o histórico.",
      );
    }
    if (response.status === 401) {
      await response.body?.cancel();
      reset();
      throw new Error(
        "Acesso inválido ou sessão expirada. Entre com sua identidade de teste.",
      );
    }
    try {
      const value = await readAuditJson(response);
      if (epoch !== sessionEpoch.current) throw new Error("STALE_SESSION");
      return value;
    } catch (e) {
      const source = e instanceof Error ? e.message : "";
      const guidance: Record<string, string> = {
        POTENTIAL_SECRET:
          "O arquivo pode conter uma credencial. Remova segredos e use somente dados sintéticos.",
        CASE_NOT_FOUND:
          "O caso não está disponível para esta identidade. Confira seu histórico autorizado.",
        ROLE_DENIED: "Esta ação exige uma identidade de teste com outro papel.",
        REVIEW_REQUIRED:
          "Conclua a revisão por uma identidade distinta antes de gerar o relatório.",
        INVALID_JSON: "O arquivo não contém JSON válido.",
        WRITE_DISABLED:
          "O serviço está em modo de consulta. O envio ainda não foi habilitado.",
      };
      throw new Error(
        Object.entries(guidance).find(([key]) => source.includes(key))?.[1] ??
          "O serviço não confirmou a operação. Confira o escopo e tente novamente; nenhum resultado novo é declarado.",
      );
    }
  }
  async function history() {
    const epoch = sessionEpoch.current;
    const data = omnixCasesSchema.parse(await request("/cases"));
    if (epoch === sessionEpoch.current) setCases(data);
  }
  async function open(id: string) {
    const epoch = sessionEpoch.current;
    const data = omnixDetailSchema.parse(await request(`/cases/${id}`));
    if (epoch !== sessionEpoch.current) return;
    setDetail(data);
    setDownload(undefined);
    setReviewed(false);
    setReview("");
    setView("result");
    window.scrollTo(0, 0);
    window.history.replaceState(
      null,
      "",
      `/omnix?case=${encodeURIComponent(id)}`,
    );
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
          : "Não foi possível confirmar a operação. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    document.title = "OMNIX AI | Prévia de auditoria";
    document.documentElement.lang = "pt-BR";
    let current = true;
    setBusy(true);
    void (async () => {
      try {
        omnixStatusSchema.parse(await request("/status"));
        let authenticated: OmnixSession | undefined;
        try {
          authenticated = omnixSessionSchema.parse(await request("/session"));
        } catch {
          /* No session is a normal access state; never fabricate one. */
        }
        if (!current) return;
        setConnection("online");
        if (authenticated) {
          setSession(authenticated);
          try {
            await history();
            const selected = new URLSearchParams(location.search).get("case");
            if (selected && /^[a-f0-9-]{36}$/i.test(selected))
              await open(selected);
          } catch (e) {
            if (current)
              setError(
                e instanceof Error
                  ? e.message
                  : "Não foi possível confirmar o histórico.",
              );
          }
        }
      } catch {
        if (current) {
          setConnection("blocked");
          setCases(undefined);
        }
      } finally {
        if (current) setBusy(false);
      }
    })();
    return () => {
      current = false;
    };
    // Mount-only discovery; all later refreshes are explicit authenticated requests.
  }, []);
  const operator = session?.user.role === "operator";
  const selected = detail?.item;
  async function transition(
    action: "run" | "review" | "finalize",
    body: unknown = {},
  ) {
    if (!selected) return;
    await perform(async () => {
      auditWorkflowActionSchema.parse(
        await request(`/cases/${selected.id}/${action}`, body),
      );
      await open(selected.id);
      await history();
      setMessage("Estado confirmado pelo serviço de auditoria.");
    });
  }
  const nav = (target: View) => {
    window.scrollTo(0, 0);
    setView(target);
    setError("");
    setMessage("");
    if (target !== "result") window.history.replaceState(null, "", "/omnix");
  };
  return (
    <div className="omnix" translate="no">
      <a className="ox-skip" href="#omnix-main">
        Pular para conteúdo
      </a>
      <header className="ox-top">
        <a className="ox-brand" href="/omnix">
          <span aria-hidden="true">◈</span>
          <b>
            OMNIX <em>AI</em>
          </b>
          <small>by XPeX Systems AI</small>
        </a>
        <a
          href="https://xpex-systems-ai.vercel.app"
          target="_blank"
          rel="noreferrer"
        >
          Conheça a XPeX ↗
        </a>
        <span className={`ox-status ${connection}`}>
          {connection === "checking"
            ? "Conferindo serviço…"
            : connection === "online"
              ? "API de teste conectada"
              : "Interface de prévia · backend pendente"}
        </span>
      </header>
      <div className="ox-notice">
        <b>PRÉVIA DE ENGENHARIA</b>
        <span>
          Somente identidades e configurações sintéticas. Cadastro e dados de
          clientes ainda não estão liberados.
        </span>
      </div>
      <div className="ox-shell">
        <aside className="ox-sidebar">
          <p className="ox-kicker">AUDIT WORKSPACE</p>
          <nav aria-label="Portal OMNIX">
            {(
              [
                ["dashboard", "Visão geral"],
                ["new", "Nova auditoria"],
                ["history", "Histórico"],
                ["example", "Exemplo de relatório"],
                ["capabilities", "Capacidades"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-current={view === id ? "page" : undefined}
                className={view === id ? "active" : ""}
                onClick={() => nav(id)}
                disabled={busy}
              >
                {label}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </nav>
          <div className="ox-side-note">
            <b>Escopo atual</b>
            <p>
              Um vercel.json.
              <br />
              Dois checks estáticos.
              <br />
              Evidências rastreáveis.
            </p>
            <small>Sem pentest, varredura de URLs ou certificação.</small>
          </div>
          {session && (
            <div className="ox-identity">
              <b>{session.user.name}</b>
              <small>
                {operator ? "Submissor de teste" : "Revisor de teste"}
              </small>
              <small>Sessão até {date(session.expiresAt)}</small>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await request("/logout", {});
                    reset();
                    nav("dashboard");
                    setMessage("Sessão de teste encerrada.");
                  })
                }
              >
                Sair da sessão
              </button>
            </div>
          )}
        </aside>
        <main id="omnix-main" className="ox-main" aria-busy={busy}>
          {error && (
            <div className="ox-error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <p className="ox-success" role="status">
              {message}
            </p>
          )}
          {busy && (
            <p className="ox-progress" role="status">
              Confirmando operação e registros…
            </p>
          )}
          {view === "example" ? (
            <>
              <p className="ox-kicker">TEST DATA / EXEMPLO CONGELADO</p>
              <h1>Evidências, em contexto.</h1>
              <p className="ox-lead">
                Relatório sintético gerado em teste local. Este exemplo não é
                uma execução da sua sessão e não comprova integração remota.
              </p>
              <section className="ox-card">
                <h2>Configuração de demonstração</h2>
                <p>
                  Dois achados associados ao arquivo de teste: roteamento e
                  declarações de headers. O conteúdo completo mantém as
                  limitações e referências.
                </p>
                <pre className="ox-code">
                  {JSON.stringify(example, null, 2)}
                </pre>
              </section>
              <button className="ox-primary" onClick={() => nav("new")}>
                Conhecer o formulário →
              </button>
            </>
          ) : (
            <>
              {!session ? (
                <section className="ox-access">
                  <div>
                    <p className="ox-kicker">BEM-VINDO AO OMNIX AI</p>
                    <h1>
                      Da configuração
                      <br />à evidência.
                    </h1>
                    <p className="ox-lead">
                      Um espaço para registrar o escopo, acompanhar verificações
                      e consultar relatórios de configuração.
                    </p>
                    <ul className="ox-list">
                      <li>Checks existentes, sem execução irrestrita.</li>
                      <li>Histórico confirmado pelo banco de dados.</li>
                      <li>Revisão distinta antes do relatório.</li>
                    </ul>
                    <button className="ox-text" onClick={() => nav("example")}>
                      Explorar um relatório sintético →
                    </button>
                  </div>
                  <div className="ox-card">
                    <p className="ox-kicker">ACESSO CONTROLADO</p>
                    <h2>Entre na prévia.</h2>
                    {connection === "blocked" ? (
                      <div className="ox-empty">
                        <b>O backend desta prévia ainda não foi conectado.</b>
                        <p>
                          Você pode navegar pela interface e pelo exemplo.
                          Login, envio e resultados persistidos ficam
                          indisponíveis até a ativação autorizada do serviço
                          dedicado.
                        </p>
                        <button type="button" onClick={() => location.reload()}>
                          Verificar novamente
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void perform(async () => {
                            const s = omnixSessionSchema.parse(
                              await request("/login", { identity, code }),
                            );
                            sessionEpoch.current++;
                            setSession(s);
                            window.scrollTo(0, 0);
                            setCode("");
                            await history();
                            setView("dashboard");
                            setMessage("Identidade de teste autenticada.");
                          });
                        }}
                      >
                        <label>
                          Identidade de teste
                          <input
                            autoComplete="username"
                            required
                            maxLength={70}
                            value={identity}
                            onChange={(e) => setIdentity(e.target.value)}
                            placeholder="Fornecida pelo responsável da prévia"
                            disabled={busy || connection !== "online"}
                          />
                        </label>
                        <label>
                          Código de acesso de teste
                          <input
                            type="password"
                            autoComplete="off"
                            required
                            minLength={43}
                            maxLength={128}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={busy || connection !== "online"}
                          />
                        </label>
                        <button
                          className="ox-primary"
                          disabled={busy || connection !== "online"}
                        >
                          Entrar com identidade de teste →
                        </button>
                        <p className="ox-muted">
                          Sem cadastro aberto. Códigos são individuais, não são
                          os tokens técnicos do motor. Para recuperar o acesso
                          de teste, solicite novo código ao responsável.
                          Identidade empresarial e recuperação de contas reais
                          são uma etapa futura.
                        </p>
                      </form>
                    )}
                  </div>
                </section>
              ) : (
                <>
                  {view === "capabilities" && (
                    <OmnixCapabilitiesPanel
                      key={`${session.user.organizationId}:${session.user.id}:${session.expiresAt}`}
                      cases={cases}
                    />
                  )}
                  {(view === "dashboard" || view === "history") && (
                    <>
                      <div className="ox-page-heading">
                        <div>
                          <p className="ox-kicker">
                            {operator
                              ? "SEUS CASOS DE TESTE"
                              : "ORGANIZAÇÃO DE TESTE / REVISÃO"}
                          </p>
                          <h1>
                            {view === "history"
                              ? "Histórico de auditorias."
                              : "Seu trabalho, com evidências."}
                          </h1>
                          <p className="ox-lead">
                            Números e estados consultados do backend, no escopo
                            da sua identidade.
                          </p>
                        </div>
                        <button
                          disabled={busy}
                          onClick={() => void perform(history)}
                        >
                          Atualizar histórico ↻
                        </button>
                      </div>
                      {cases ? (
                        <>
                          <section
                            className="ox-metrics"
                            aria-label="Resumo persistido"
                          >
                            {[
                              ["Auditorias", cases.summary.total],
                              ["Casos abertos", cases.summary.open],
                              ["Concluídos", cases.summary.closed],
                            ].map(([label, value]) => (
                              <article key={label}>
                                <span>{label}</span>
                                <strong>{value}</strong>
                                <small>Confirmado pelo serviço</small>
                              </article>
                            ))}
                            <article>
                              <span>Achados por gravidade</span>
                              <div>
                                {Object.entries(
                                  cases.summary.findingsBySeverity,
                                ).length ? (
                                  Object.entries(
                                    cases.summary.findingsBySeverity,
                                  ).map(([key, count]) => (
                                    <p key={key}>
                                      <b>{count}</b> {key}
                                    </p>
                                  ))
                                ) : (
                                  <p>Nenhum achado registrado.</p>
                                )}
                              </div>
                              <small>
                                Classificação retornada pelos checks
                              </small>
                            </article>
                          </section>
                          <section className="ox-card">
                            <div className="ox-section-heading">
                              <h2>Última atividade</h2>
                              {operator && (
                                <button
                                  className="ox-primary"
                                  onClick={() => nav("new")}
                                >
                                  Nova auditoria +
                                </button>
                              )}
                            </div>
                            {cases.items.length ? (
                              <div className="ox-table-wrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Projeto / caso</th>
                                      <th>Estado</th>
                                      <th>Achados</th>
                                      <th>Atualização</th>
                                      <th>Resultado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cases.items.map((c) => (
                                      <tr key={c.id}>
                                        <td>
                                          <b>{c.title}</b>
                                          <small>{c.id}</small>
                                        </td>
                                        <td>
                                          <span className="ox-pill">
                                            {states[c.status]}
                                          </span>
                                        </td>
                                        <td>{c.findingCount}</td>
                                        <td>{date(c.updatedAt)}</td>
                                        <td>
                                          <button
                                            onClick={() =>
                                              void perform(() => open(c.id))
                                            }
                                            disabled={busy}
                                          >
                                            Abrir caso →
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="ox-empty">
                                <h3>Seu histórico começa aqui.</h3>
                                <p>
                                  Não há auditorias persistidas disponíveis para
                                  esta identidade.
                                </p>
                                {operator && (
                                  <button onClick={() => nav("new")}>
                                    Criar primeiro caso de teste →
                                  </button>
                                )}
                              </div>
                            )}
                            {cases.hasMore && (
                              <p className="ox-muted">
                                Exibindo os50 casos mais recentes. O resumo
                                considera todo o escopo autorizado.
                              </p>
                            )}
                          </section>
                        </>
                      ) : (
                        <section className="ox-empty">
                          <h2>Histórico ainda não confirmado.</h2>
                          <p>
                            Atualize a consulta para carregar os registros.
                            Nenhum número de demonstração substitui o backend.
                          </p>
                        </section>
                      )}
                    </>
                  )}
                  {view === "new" && (
                    <>
                      <p className="ox-kicker">
                        NOVA AUDITORIA / CONFIGURATION INTEGRITY AUDIT
                      </p>
                      <h1>Comece pelo escopo.</h1>
                      <p className="ox-lead">
                        Envie apenas um vercel.json sintético e sanitizado.
                        Nenhuma URL será buscada e nenhuma configuração externa
                        será alterada.
                      </p>
                      {!operator ? (
                        <section className="ox-empty">
                          <h2>Esta identidade revisa os casos.</h2>
                          <p>
                            A criação e execução pertencem à identidade de
                            submissor.
                          </p>
                          <button onClick={() => nav("history")}>
                            Abrir casos para revisão →
                          </button>
                        </section>
                      ) : (
                        <form
                          className="ox-card ox-audit-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void perform(async () => {
                              const body = {
                                requestId,
                                assetName: name,
                                assetReference: "test-fixture/vercel.json",
                                authorizationReference: `TEST DATA / autorização de ${session.user.id}`,
                                authorized,
                                testData: true,
                                checks,
                                artifact: { name: "vercel.json", content },
                              };
                              if (!synthetic)
                                throw new Error(
                                  "Confirme que o arquivo contém somente dados sintéticos.",
                                );
                              if (
                                !auditWorkflowIntakeSchema.safeParse(body)
                                  .success
                              )
                                throw new Error(
                                  "Confira projeto, escopo, conteúdo e autorização antes de enviar.",
                                );
                              configObject(content);
                              if (
                                new TextEncoder().encode(JSON.stringify(body))
                                  .length > 32768
                              )
                                throw new Error(
                                  "O corpo excede32 KB. Reduza a configuração.",
                                );
                              const r = auditWorkflowActionSchema.parse(
                                await request("/cases", body),
                              );
                              setRequestId(crypto.randomUUID());
                              await open(r.caseId);
                              await history();
                              setMessage(
                                "Escopo e evidência registrados. Execute os checks no resultado.",
                              );
                            });
                          }}
                        >
                          <label>
                            Nome do projeto
                            <input
                              required
                              minLength={3}
                              maxLength={180}
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              disabled={busy}
                            />
                          </label>
                          <fieldset>
                            <legend>Verificações implementadas</legend>
                            {(
                              Object.entries(checkNames) as [
                                AuditWorkflowIntake["checks"][number],
                                string,
                              ][]
                            ).map(([id, label]) => (
                              <label className="ox-checkbox" key={id}>
                                <input
                                  type="checkbox"
                                  checked={checks.includes(id)}
                                  disabled={busy}
                                  onChange={(e) =>
                                    setChecks(
                                      e.target.checked
                                        ? [...checks, id]
                                        : checks.filter((x) => x !== id),
                                    )
                                  }
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </fieldset>
                          <label>
                            Arquivo vercel.json sanitizado
                            <input
                              type="file"
                              accept=".json,application/json"
                              disabled={busy}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                // A replacement invalidates the previous artifact and consent,
                                // including when the newly selected file is rejected.
                                setContent("");
                                setAuthorized(false);
                                setSynthetic(false);
                                e.target.value = "";
                                void perform(async () => {
                                  if (
                                    file.name !== "vercel.json" ||
                                    file.size > 16000
                                  )
                                    throw new Error(
                                      "Selecione apenas vercel.json com até16.000 bytes.",
                                    );
                                  const text = await file.text();
                                  configObject(text);
                                  setContent(text);
                                });
                              }}
                            />
                          </label>
                          <label>
                            Conteúdo da configuração
                            <textarea
                              spellCheck={false}
                              required
                              maxLength={16000}
                              value={content}
                              onChange={(e) => {
                                setContent(e.target.value);
                                setAuthorized(false);
                                setSynthetic(false);
                              }}
                              disabled={busy}
                            />
                          </label>
                          <p className="ox-muted">
                            Até16.000 caracteres; arquivo até16.000 bytes; corpo
                            total32 KB. Remova credenciais e dados de empresas.
                            O servidor também valida o conteúdo.
                          </p>
                          <label className="ox-checkbox">
                            <input
                              type="checkbox"
                              required
                              checked={synthetic}
                              onChange={(e) => setSynthetic(e.target.checked)}
                              disabled={busy}
                            />
                            <span>
                              Confirmo que o conteúdo é inteiramente sintético.
                            </span>
                          </label>
                          <label className="ox-checkbox">
                            <input
                              type="checkbox"
                              required
                              checked={authorized}
                              onChange={(e) => setAuthorized(e.target.checked)}
                              disabled={busy}
                            />
                            <span>
                              Tenho autorização para analisar este ativo e
                              fornecer este arquivo.
                            </span>
                          </label>
                          <div className="ox-actions">
                            <button
                              className="ox-primary"
                              disabled={
                                busy ||
                                !authorized ||
                                !synthetic ||
                                !checks.length
                              }
                            >
                              Registrar escopo e evidência →
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setName("TEST DATA · projeto de demonstração");
                                setContent(sample);
                                setAuthorized(false);
                                setSynthetic(false);
                              }}
                            >
                              Usar configuração sintética
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                  {view === "result" && selected && detail && (
                    <>
                      <p className="ox-kicker">
                        RESULTADO DO CASO / DADOS PERSISTIDOS
                      </p>
                      <h1>{selected.title}</h1>
                      <div className="ox-result-meta">
                        <span className="ox-pill">
                          {states[selected.status]}
                        </span>
                        <code>{selected.id}</code>
                        <button
                          disabled={busy}
                          onClick={() => void perform(() => open(selected.id))}
                        >
                          Atualizar estado ↻
                        </button>
                      </div>
                      <section className="ox-card">
                        <h2>Escopo e verificações</h2>
                        <pre className="ox-code">
                          {JSON.stringify(detail.item.metadata.scope, null, 2)}
                        </pre>
                        {detail.item.metadata.results?.map((r, index) => (
                          <div className="ox-finding" key={index}>
                            <h3>{checkNames[r.checkId]}</h3>
                            <span className="ox-pill">{r.outcome}</span>
                            <p>{r.summary}</p>
                            <p>{r.recommendation}</p>
                          </div>
                        ))}
                        {operator && selected.status === "DRAFT" && (
                          <button
                            className="ox-primary"
                            disabled={busy}
                            onClick={() => void transition("run")}
                          >
                            Executar verificações delimitadas →
                          </button>
                        )}
                      </section>
                      <div className="ox-result-grid">
                        <section className="ox-card">
                          <h2>Achados ({detail.findings.length})</h2>
                          {detail.findings.length ? (
                            detail.findings.map((f) => (
                              <article className="ox-finding" key={f.id}>
                                <h3>{f.title}</h3>
                                <p>{f.summary}</p>
                                <p>{f.recommendation}</p>
                                <small>
                                  Evidências:{" "}
                                  {JSON.stringify(f.metadata?.evidenceIds)}
                                </small>
                              </article>
                            ))
                          ) : (
                            <p>
                              Nenhum achado registrado. Execute os checks para
                              obter resultados.
                            </p>
                          )}
                        </section>
                        <section className="ox-card">
                          <h2>Evidências ({detail.evidences.length})</h2>
                          {detail.evidences.map((e) => (
                            <article key={e.id}>
                              <h3>Configuração recebida</h3>
                              <code>{e.id}</code>
                              <p className="ox-hash">
                                SHA256: {String(e.metadata?.sha256)}
                              </p>
                              <pre className="ox-code">{e.redacted_text}</pre>
                            </article>
                          ))}
                        </section>
                      </div>
                      <section className="ox-card">
                        <h2>Revisão e relatório</h2>
                        <p>
                          O relatório exige revisão por identidade de teste
                          distinta. Essa revisão sintética não é certificação ou
                          parecer humano independente.
                        </p>
                        <pre className="ox-code">
                          {JSON.stringify(
                            detail.item.metadata.review ?? {
                              estado: "Revisão ainda não registrada",
                            },
                            null,
                            2,
                          )}
                        </pre>
                        {!operator && selected.status === "IN_REVIEW" && (
                          <>
                            <label>
                              Referência da revisão de teste
                              <input
                                value={review}
                                maxLength={400}
                                minLength={3}
                                onChange={(e) => setReview(e.target.value)}
                                disabled={busy}
                              />
                            </label>
                            <label className="ox-checkbox">
                              <input
                                type="checkbox"
                                checked={reviewed}
                                onChange={(e) => setReviewed(e.target.checked)}
                                disabled={busy}
                              />
                              <span>
                                Conferi o escopo, os achados, as evidências e as
                                limitações nesta revisão de teste.
                              </span>
                            </label>
                            <div className="ox-actions">
                              <button
                                className="ox-primary"
                                disabled={
                                  busy || !reviewed || review.trim().length < 3
                                }
                                onClick={() =>
                                  void transition("review", {
                                    decision: "approve",
                                    humanReviewed: true,
                                    reviewReference: `TEST DATA / ${session.user.id} / ${review}`,
                                  })
                                }
                              >
                                Aprovar revisão de teste
                              </button>
                              <button
                                disabled={
                                  busy || !reviewed || review.trim().length < 3
                                }
                                onClick={() =>
                                  void transition("review", {
                                    decision: "reject",
                                    humanReviewed: true,
                                    reviewReference: `TEST DATA / ${session.user.id} / ${review}`,
                                  })
                                }
                              >
                                Solicitar ajuste
                              </button>
                            </div>
                          </>
                        )}
                        {operator && selected.status === "IN_REVIEW" && (
                          <p className="ox-muted">
                            Aguardando identidade revisora de teste. Saia da
                            sessão para alternar o acesso autorizado.
                          </p>
                        )}
                        {operator && selected.status === "READY_FOR_REPORT" && (
                          <button
                            className="ox-primary"
                            disabled={busy}
                            onClick={() => void transition("finalize")}
                          >
                            Gerar relatório e fechar caso →
                          </button>
                        )}
                        {selected.status === "CLOSED" && (
                          <div className="ox-actions">
                            <button
                              className="ox-primary"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  const report =
                                    auditWorkflowReportSchema.parse(
                                      await request(
                                        `/cases/${selected.id}/report`,
                                      ),
                                    );
                                  const url = URL.createObjectURL(
                                    new Blob(
                                      [JSON.stringify(report, null, 2)],
                                      { type: "application/json" },
                                    ),
                                  );
                                  setDownload({
                                    url,
                                    id: selected.id,
                                    sha256: report.sha256,
                                  });
                                  setMessage(
                                    "JSON preparado. Use o link para baixar e conferir o arquivo recebido.",
                                  );
                                })
                              }
                            >
                              Preparar exportação JSON
                            </button>
                            {download && (
                              <a
                                className="ox-download"
                                href={download.url}
                                download={`audit-${download.id}.json`}
                              >
                                Baixar relatório JSON ↓
                              </a>
                            )}
                          </div>
                        )}
                        {download && (
                          <p className="ox-hash">
                            Hash canônico do relatório: {download.sha256}
                          </p>
                        )}
                      </section>
                      <p className="ox-muted">
                        Os checks analisam declarações do arquivo. Não medem
                        disponibilidade, headers entregues ou qualidade da
                        política. Casos fechados mantêm a integridade e não
                        podem ser reexecutados.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}
          <footer className="ox-footer">
            <span>OMNIX AI / GXEON Audit OS</span>
            <span>Evidence before approval.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
