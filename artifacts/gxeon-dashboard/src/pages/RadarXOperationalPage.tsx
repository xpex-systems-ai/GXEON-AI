import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Radar, ShieldCheck, Sparkles } from "lucide-react";
import { fetchRadarStatus, previewManualOpportunity, type RadarOpportunityPreview, type RadarSource, type RadarStatus } from "@/services/radarService";

const fallbackSources: RadarSource[] = ["Manual", "Referral", "Workana", "99Freelas", "LinkedIn", "Email", "Form"];

export default function RadarXOperationalPage() {
  const [status, setStatus] = useState<RadarStatus | null>(null);
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

  useEffect(() => {
    const controller = new AbortController();
    fetchRadarStatus(controller.signal)
      .then((data) => {
        setStatus(data);
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
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "RADAR_PREVIEW_FAILED");
    } finally {
      setLoading(false);
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
            <Badge variant="outline" className="border-amber-300/40 text-amber-100">no auto-scraping</Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Manual opportunity intake</h1>
          <p className="max-w-4xl text-slate-300">Submit operator-known opportunity context, normalize it and preview a score. P0 does not persist leads or automate external marketplaces.</p>
        </div>
      </section>

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
          <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Runtime boundaries</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>Persistence: {status?.persistence ?? "DISABLED_IN_P0"}</p>
              <p>Scraping: {status?.scraping ?? "DISABLED"}</p>
              <p>Marketplace automation: {status?.marketplaceAutomation ?? "DISABLED"}</p>
            </CardContent>
          </Card>

          <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-cyan-200" /> Preview result</CardTitle></CardHeader>
            <CardContent>
              {preview ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4"><p className="text-sm uppercase tracking-[0.25em] text-cyan-100/70">Score</p><p className="text-5xl font-black text-white">{preview.score}</p></div>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">{preview.scoringExplanation.map((item) => <li key={item}>{item}</li>)}</ul>
                  <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50">{preview.recommendedNextStep}</p>
                </div>
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">Submit the form to preview normalized scoring. No lead will be stored.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
