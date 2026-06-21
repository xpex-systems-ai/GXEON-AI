import { ecosystemCards } from "./ecosystemCards";

export function GxeonEcosystemPage() {
  return (
    <section className="space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-400">GXEON OS</p>
        <h1 className="text-3xl font-bold">Ecosystem Command Map</h1>
        <p className="text-muted-foreground">Read-only module map. Audit OS remains preserved; unfinished APIs are not required.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ecosystemCards.map((card) => (
          <article key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{card.name}</h2>
              <span className="rounded-full border px-2 py-1 text-xs">{card.status}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{card.purpose}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide">Next mission</p>
            <p className="text-sm">{card.nextMission}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GxeonEcosystemPage;
