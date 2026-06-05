import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { gxeonNavigation } from "@/data/gxeon-os";
import { Atom, CircleDot } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-cyan-300/15 bg-slate-950/90 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl lg:flex">
      <div className="border-b border-cyan-300/15 p-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 shadow-lg shadow-cyan-500/20">
            <Atom className="h-7 w-7" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
          </div>
          <div>
            <p className="text-xl font-black tracking-[0.22em] text-white">GXEON OS</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/70">Quantum Ecosystem</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {gxeonNavigation.map((route, index) => {
          const isActive = location === route.route;
          const Icon = route.icon;
          return (
            <Link key={route.route} href={route.route}>
              <Button
                variant="ghost"
                className={cn(
                  "group h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-slate-300 hover:border-cyan-300/20 hover:bg-cyan-400/10 hover:text-white",
                  isActive && "border-cyan-300/35 bg-cyan-400/15 text-white shadow-lg shadow-cyan-950/40",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{String(index + 1).padStart(2, "0")} · {route.name}</span>
                  <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">{route.status?.replaceAll("_", " ") ?? "mock ready"}</span>
                </span>
                {isActive && <CircleDot className="h-3 w-3 text-emerald-300" />}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">Activation state</p>
        <p className="mt-1 text-sm font-semibold text-white">100% visual · 0 APIs ativas</p>
      </div>
    </aside>
  );
}
