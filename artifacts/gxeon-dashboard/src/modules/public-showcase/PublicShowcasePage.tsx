import { publicShowcaseContent } from "./showcaseContent";

export default function PublicShowcasePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="rounded-3xl border border-cyan-400/30 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">GXEON OS Public Showcase</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Execution intelligence for AI-powered digital operations.</h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-300">{publicShowcaseContent.thesis}</p>
          <p className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-950/30 p-4 text-sm text-amber-100">{publicShowcaseContent.statusNotice}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">Current active product</h2>
            <p className="mt-3 text-3xl font-black">{publicShowcaseContent.currentProduct}</p>
            <p className="mt-4 text-slate-300">Evidence-led audits for websites, repositories, APIs, deploys, funnels, automations, and digital operations.</p>
          </section>
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">CTA tracks</h2>
            <ul className="mt-4 space-y-2 text-slate-300">
              {publicShowcaseContent.ctas.map((cta) => <li key={cta}>• {cta}</li>)}
            </ul>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold text-cyan-200">Safety principles</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {publicShowcaseContent.safetyPrinciples.map((principle) => (
              <span key={principle} className="rounded-2xl border border-cyan-400/20 bg-cyan-950/30 px-4 py-3 text-sm font-semibold text-cyan-100">{principle}</span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold text-cyan-200">Roadmap with honest labels</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {publicShowcaseContent.roadmap.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-700 p-4">
                <p className="font-bold">{item.label}</p>
                <p className="text-sm uppercase tracking-widest text-slate-400">{item.status}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
