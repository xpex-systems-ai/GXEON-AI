import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Github, Radar, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  fetchGitHubRadarStatus,
  fetchRadarStatus,
  previewManualOpportunity,
  searchGitHubOpportunityPreview,
  type GitHubOpportunityCategory,
  type GitHubOpportunityPreview,
  type GitHubRadarStatus,
  type RadarOpportunityPreview,
  type RadarSource,
  type RadarStatus,
} from "@/services/radarService";
import { createOpportunityFromRadarGitHubPreview, createOpportunityFromRadarManualPreview } from "@/services/opportunityService";

const fallbackSources: RadarSource[] = ["Manual", "Referral", "Workana", "99Freelas", "LinkedIn", "Email", "Form"];
const githubQueryPresets = [
  "label:\"help wanted\" supabase integration",
  "label:\"help wanted\" railway deploy",
  "label:\"help wanted\" vercel deployment",
  "label:\"good first issue\" automation",
  "label:\"bounty\" bug",
  "\"looking for contributors\" automation",
  "\"help wanted\" \"API integration\"",
  "\"need help\" \"GitHub Actions\"",
  "\"bug\" \"Vercel\" \"deployment\"",
  "\"Supabase\" \"RLS\" \"help wanted\"",
];
const githubCategories: GitHubOpportunityCategory[] = ["integration_help", "deployment_fix", "automation_task", "documentation_improvement", "bug_fix", "ai_agent_task", "github_actions_ci", "supabase_rls", "vercel_frontend", "railway_runtime"];

type ActiveTab = "manual" | "github";

export default function RadarXOperationalPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("manual");
  const [status, setStatus] = useState<RadarStatus | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubRadarStatus | null>(null);
  const [source, setSource] = useState<RadarSource>("Manual");
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [budget, setBudget] = useState("");
  const [urgency, setUrgency] = useState("");
  const [contactChannel, setContactChannel] = useState("");
  const [notes, setNotes] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [preview, setPreview] = useState<RadarOpportunityPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubQuery, setGithubQuery] = useState(githubQueryPresets[0]);
  const [githubCategory, setGithubCategory] = useState<string>("");
  const [githubLimit, setGithubLimit] = useState(3);
  const [githubPreview, setGithubPreview] = useState<GitHubOpportunityPreview | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [manualInboxConfirmed, setManualInboxConfirmed] = useState(false);
  const [githubInboxConfirmedId, setGithubInboxConfirmedId] = useState<string | null>(null);
  const [inboxMessage, setInboxMessage] = useState<string | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxLoadingId, setInboxLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchRadarStatus(controller.signal), fetchGitHubRadarStatus(controller.signal)])
      .then(([manualStatus, ghStatus]) => {
        setStatus(manualStatus);
        setGithubStatus(ghStatus);
        setError(null);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "RADAR_STATUS_UNAVAILABLE");
      });
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await previewManualOpportunity({ source, title, problem, budget, urgency, contactChannel, notes, consentConfirmed }));
      setInboxMessage(null);
      setInboxError(null);
      setManualInboxConfirmed(false);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "RADAR_PREVIEW_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGithubLoading(true);
    setGithubError(null);
    setGithubPreview(null);
    try {
      setGithubPreview(await searchGitHubOpportunityPreview({ query: githubQuery, category: githubCategory || undefined, limit: githubLimit }));
      setInboxMessage(null);
      setInboxError(null);
      setGithubInboxConfirmedId(null);
    } catch (previewError) {
      setGithubError(previewError instanceof Error ? previewError.message : "GITHUB_OPPORTUNITY_PREVIEW_FAILED");
    } finally {
      setGithubLoading(false);
    }
  }



  async function handleAddManualToInbox() {
    if (!preview) return;
    setInboxLoadingId("manual");
    setInboxError(null);
    setInboxMessage(null);
    try {
      const result = await createOpportunityFromRadarManualPreview(preview, manualInboxConfirmed);
      setInboxMessage(`Internal opportunity ${result.opportunity.id} added to REVIEW. No external action was taken.`);
    } catch (addError) {
      setInboxError(addError instanceof Error ? addError.message : "OPPORTUNITY_INBOX_ADD_FAILED");
    } finally {
      setInboxLoadingId(null);
    }
  }

  async function handleAddGitHubToInbox(candidateId: string) {
    const candidate = githubPreview?.candidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    setInboxLoadingId(candidateId);
    setInboxError(null);
    setInboxMessage(null);
    try {
      const result = await createOpportunityFromRadarGitHubPreview(candidate, githubInboxConfirmedId === candidateId);
      setInboxMessage(`Internal opportunity ${result.opportunity.id} added to REVIEW. No GitHub write or external contact occurred.`);
    } catch (addError) {
      setInboxError(addError instanceof Error ? addError.message : "OPPORTUNITY_INBOX_ADD_FAILED");
    } finally {
      setInboxLoadingId(null);
    }
  }

  const sources = status?.acceptedSources ?? fallbackSources;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_18%_26%,rgba(16,185,129,0.16),transparent_34%)]" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">Radar X operational intake</Badge>
            <Badge variant="outline" className="border-emerald-300/40 text-emerald-100">preview only</Badge>
            <Badge variant="outline" className="border-amber-300/40 text-amber-100">no scraping · no GitHub writes</Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Radar X opportunity engine</h1>
          <p className="max-w-4xl text-slate-300">Submit operator-known opportunities or search public GitHub signals through the backend-only preview engine. P0 does not persist leads, contact users, write to GitHub or automate marketplaces.</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-2">
        <Button type="button" onClick={() => setActiveTab("manual")} className={activeTab === "manual" ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "bg-transparent text-slate-200 hover:bg-white/10"}>Manual Intake</Button>
        <Button type="button" onClick={() => setActiveTab("github")} className={activeTab === "github" ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "bg-transparent text-slate-200 hover:bg-white/10"}>GitHub Opportunity Engine</Button>
      </div>

      {activeTab === "manual" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Radar className="h-5 w-5 text-cyan-200" /> Intake form</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="source" className="text-slate-200">Source</Label>
                    <select id="source" value={source} onChange={(event) => setSource(event.target.value as RadarSource)} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                      {sources.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-slate-200">Opportunity title</Label>
                    <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short real opportunity title" className="border-white/10 bg-slate-950 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem" className="text-slate-200">Problem / desired outcome</Label>
                  <Textarea id="problem" value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Describe only operator-submitted context." className="min-h-28 border-white/10 bg-slate-950 text-white" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label htmlFor="budget" className="text-slate-200">Budget signal</Label><Input id="budget" value={budget} onChange={(event) => setBudget(event.target.value)} className="border-white/10 bg-slate-950 text-white" /></div>
                  <div className="space-y-2"><Label htmlFor="urgency" className="text-slate-200">Urgency</Label><Input id="urgency" value={urgency} onChange={(event) => setUrgency(event.target.value)} className="border-white/10 bg-slate-950 text-white" /></div>
                  <div className="space-y-2"><Label htmlFor="contact" className="text-slate-200">Contact channel</Label><Input id="contact" value={contactChannel} onChange={(event) => setContactChannel(event.target.value)} className="border-white/10 bg-slate-950 text-white" /></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-slate-200">Operator notes</Label>
                  <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="border-white/10 bg-slate-950 text-white" />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                  <input type="checkbox" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} />
                  Consent/legitimate operator context confirmed for preview.
                </label>
                {error && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
                <Button disabled={loading} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{loading ? "Previewing..." : "Preview scoring only"}</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <RuntimeBoundaries status={status} githubStatus={githubStatus} />
            <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
              <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-cyan-200" /> Preview result</CardTitle></CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4"><p className="text-sm uppercase tracking-[0.25em] text-cyan-100/70">Score</p><p className="text-5xl font-black text-white">{preview.score}</p></div>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">{preview.scoringExplanation.map((item) => <li key={item}>{item}</li>)}</ul>
                    <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50">{preview.recommendedNextStep}</p>
                    <label className="flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">
                      <input type="checkbox" checked={manualInboxConfirmed} onChange={(event) => setManualInboxConfirmed(event.target.checked)} />
                      Operator confirms internal Opportunity Inbox add. No external action will be taken.
                    </label>
                    <Button type="button" disabled={!manualInboxConfirmed || inboxLoadingId === "manual"} onClick={handleAddManualToInbox} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">{inboxLoadingId === "manual" ? "Adding..." : "Add to Opportunity Inbox"}</Button>
                    {inboxMessage && <p className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{inboxMessage}</p>}
                    {inboxError && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{inboxError}</p>}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">Submit the form to preview normalized scoring. No lead will be stored.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Github className="h-5 w-5 text-cyan-200" /> GitHub search preview</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleGitHubSearch}>
                <div className="space-y-2">
                  <Label htmlFor="preset" className="text-slate-200">Preset query</Label>
                  <select id="preset" value={githubQuery} onChange={(event) => setGithubQuery(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                    {githubQueryPresets.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-query" className="text-slate-200">Custom query</Label>
                  <Textarea id="github-query" value={githubQuery} onChange={(event) => setGithubQuery(event.target.value)} className="min-h-24 border-white/10 bg-slate-950 text-white" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="github-category" className="text-slate-200">Category override</Label>
                    <select id="github-category" value={githubCategory} onChange={(event) => setGithubCategory(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                      <option value="">Auto infer</option>
                      {githubCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github-limit" className="text-slate-200">Candidate limit (max 10)</Label>
                    <Input id="github-limit" type="number" min={1} max={10} value={githubLimit} onChange={(event) => setGithubLimit(Number(event.target.value))} className="border-white/10 bg-slate-950 text-white" />
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">Backend-only GitHub REST API search. Preview returns public metadata only and never exposes tokens.</div>
                {githubError && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{githubError}</p>}
                <Button disabled={githubLoading} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Search className="mr-2 h-4 w-4" />{githubLoading ? "Searching..." : "Search preview only"}</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <RuntimeBoundaries status={status} githubStatus={githubStatus} />
            <div className="space-y-4">
              {githubPreview && (
                <Card className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
                  <CardContent className="grid gap-3 p-4 text-xs text-slate-300 md:grid-cols-2">
                    <p>Normalized query: <span className="text-cyan-100">{githubPreview.normalizedQuery}</span></p>
                    <p>Effective limit: {githubPreview.effectiveLimit} · authenticated: {githubPreview.authenticated ? "true" : "false"}</p>
                    <p>Provider: {githubPreview.diagnostics.provider} {githubPreview.diagnostics.searchEndpoint}</p>
                    <p>Skipped PRs: {githubPreview.diagnostics.skippedPullRequests} · metadata fallbacks: {githubPreview.diagnostics.repositoryMetadataFailures}</p>
                  </CardContent>
                </Card>
              )}
              {inboxMessage && <p className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{inboxMessage}</p>}
              {inboxError && <p className="rounded-2xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{inboxError}</p>}
              {githubPreview?.candidates.length ? githubPreview.candidates.map((candidate) => (
                <Card key={candidate.id} className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle className="text-white">{candidate.title}</CardTitle>
                        <p className="text-sm text-slate-400">{candidate.repository.fullName} · {candidate.category} · updated {candidate.updatedAt ?? "unknown"}</p>
                      </div>
                      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-center"><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Score</p><p className="text-3xl font-black text-white">{candidate.opportunityScore.score}</p></div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-300">
                    <p>{candidate.bodyExcerpt ?? "No public issue body excerpt returned by GitHub."}</p>
                    <div className="flex flex-wrap gap-2">{candidate.labels.map((label) => <Badge key={label} variant="outline" className="border-white/15 text-slate-200">{label}</Badge>)}</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Risks: {candidate.opportunityScore.riskFlags.join(", ") || "none detected"}</div>
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-amber-50">Next step: {candidate.opportunityScore.recommendedNextStep}</div>
                    </div>
                    <ul className="list-disc space-y-1 pl-5">{candidate.opportunityScore.scoringExplanation.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">
                        <input type="checkbox" checked={githubInboxConfirmedId === candidate.id} onChange={(event) => setGithubInboxConfirmedId(event.target.checked ? candidate.id : null)} />
                        Operator confirms internal add only. No GitHub write, comment, issue, PR or external contact will occur.
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <a className="rounded-md border border-cyan-300/30 px-3 py-2 text-cyan-100 hover:bg-cyan-400/10" href={candidate.url} target="_blank" rel="noreferrer">Open public issue</a>
                        <Button type="button" disabled={githubInboxConfirmedId !== candidate.id || inboxLoadingId === candidate.id} onClick={() => handleAddGitHubToInbox(candidate.id)} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">{inboxLoadingId === candidate.id ? "Adding..." : "Add to Opportunity Inbox"}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
                  <CardContent className="p-6 text-sm text-slate-300">Run a GitHub preview search to see up to ten scored opportunity candidates. No candidates are persisted.</CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function RuntimeBoundaries({ status, githubStatus }: { status: RadarStatus | null; githubStatus: GitHubRadarStatus | null }) {
  return (
    <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
      <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Runtime boundaries</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <p>Manual persistence: {status?.persistence ?? "DISABLED_IN_P0"}</p>
        <p>GitHub persistence: {githubStatus?.persistence ?? "PREVIEW_ONLY"}</p>
        <p>Scraping: {status?.scraping ?? "DISABLED"}</p>
        <p>Marketplace automation: {status?.marketplaceAutomation ?? "DISABLED"}</p>
        <p>External contact: {githubStatus?.externalContact === false ? "NONE" : "NONE"}</p>
        <p>GitHub writes: {githubStatus?.githubWrites === false ? "false" : "false"}</p>
      </CardContent>
    </Card>
  );
}
