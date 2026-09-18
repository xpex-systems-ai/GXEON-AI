import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ClipboardList, Hexagon, LayoutDashboard, Radar, ScrollText, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { snapshotQuery } from "@/lib/clawlancer/data-source";
import { Badge, DemoTag, fmtDateTime } from "./primitives";

const nav = [
  { to: "/", label: "Mission Control", icon: LayoutDashboard },
  { to: "/radar", label: "Radar", icon: Radar },
  { to: "/tasks", label: "Fila de tarefas", icon: ClipboardList },
  { to: "/evidence", label: "Evidence log", icon: ScrollText },
  { to: "/earnings", label: "Earnings", icon: TrendingUp },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useQuery(snapshotQuery);
  const isDemo = !data || data.mode === "demo";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur lg:flex">
        <Brand />
        <nav className="mt-2 flex flex-col gap-0.5 px-3">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </nav>
        <div className="mt-auto space-y-3 p-4 text-xs text-muted-foreground">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="eyebrow mb-1">Fonte de dados</p>
            <p className="mono-id text-[0.68rem] text-foreground">{data?.source ?? "—"}</p>
            <p className="mt-1">Atualizado {fmtDateTime(data?.generatedAt)}</p>
          </div>
          <p>Frontend somente leitura · sem chaves · sem custódia</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
              <Activity className="size-4 text-cyan" />
              Ecossistema GXEON · Clawlancer Monitor
            </div>
            <div className="flex items-center gap-2">
              {isDemo ? (
                <Badge tone="warning" dot>
                  MODO DEMO
                </Badge>
              ) : (
                <Badge tone="success" dot>
                  LIVE
                </Badge>
              )}
              <Badge tone="cyan">read-only</Badge>
            </div>
          </div>
          {isDemo && (
            <div className="border-t border-warning/20 bg-warning-dim px-4 py-1.5 text-center text-[0.72rem] text-warning md:px-8">
              Todos os dados exibidos são <DemoTag className="mx-1" /> fictícios. Nenhuma receita real é
              representada até a conexão com a API backend.
            </div>
          )}
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 lg:pb-8">{children}</main>

        {/* Bottom nav mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-sidebar/95 backdrop-blur lg:hidden">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} mobile />
          ))}
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-4 py-4">
      <span className="relative flex size-8 items-center justify-center">
        <Hexagon className="absolute size-8 text-gold" strokeWidth={1.5} />
        <span className="font-display text-xs font-bold text-gold">G</span>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-bold tracking-wide">
          GXEON <span className="text-gradient-gold">Clawlancer</span>
        </span>
        {!compact && <span className="block text-[0.65rem] tracking-widest text-muted-foreground">MONITOR v0.1</span>}
      </span>
    </Link>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  mobile,
}: {
  to: (typeof nav)[number]["to"];
  label: string;
  icon: typeof Radar;
  mobile?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className={cn(
        "flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        mobile ? "flex-col gap-1 py-2 text-[0.6rem]" : "rounded-lg px-3 py-2 hover:bg-sidebar-accent",
      )}
      activeProps={{
        className: cn(
          "text-foreground",
          mobile ? "text-gold" : "bg-sidebar-accent text-gold border border-gold/20",
        ),
      }}
    >
      <Icon className={mobile ? "size-5" : "size-4"} />
      <span className={mobile ? "truncate" : ""}>{mobile ? label.split(" ")[0] : label}</span>
    </Link>
  );
}