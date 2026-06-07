import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buildGxeonPlaceholderPath, gxeonNavigation } from "@/data/gxeon-os";
import { BrainCircuit, CircleDot, LockKeyhole } from "lucide-react";

const cockpitLabels: Record<string, string> = {
  command_center: "QG Central",
  war_room: "Sala de Guerra",
  radar_x: "Radar X",
  agent_hub: "Mission Control",
  marketplace: "Propostas",
  task_engine: "Tarefas",
  financial_core: "Banco de Dados",
  monetization_board: "Monetização",
  revenue_engine_p0: "P0 Caixa de Oportunidades",
  revenue_engine_p1: "P1 Fila de Tarefas",
  revenue_engine_p2: "P2 Rastreador de Execução",
  revenue_engine_p3: "P3 Validação de Entrega",
  revenue_engine_p4: "P4 Release Gate",
  revenue_engine_p5: "P5 Ledger Financeiro",
  api_gateway: "Analytics",
  integrations: "Conectores",
  automation: "Deploys",
  settings: "Segurança",
};

const cockpitGroups = [
  { title: "Comando", ids: ["command_center", "war_room", "agent_hub"] },
  { title: "Monetização", ids: ["monetization_board", "revenue_engine_p0", "revenue_engine_p1", "revenue_engine_p2", "revenue_engine_p3", "revenue_engine_p4", "revenue_engine_p5"] },
  { title: "Captação", ids: ["radar_x", "marketplace"] },
  { title: "Infraestrutura", ids: ["integrations", "financial_core", "automation", "api_gateway", "settings"] },
];

const statusLabel = {
  operational: "Operacional",
  pending: "Pendente",
  locked: "Bloqueado",
  future: "Futuro",
  ready_to_connect: "Pronto para conectar",
};

export function Sidebar() {
  const [location] = useLocation();
  let visibleIndex = 0;

  return (
    <aside className="hidden h-full w-80 shrink-0 flex-col border-r border-amber-300/15 bg-[#050403]/95 shadow-2xl shadow-black/50 backdrop-blur-xl lg:flex">
      <div className="border-b border-amber-300/15 p-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/40 bg-amber-400/10 text-amber-100 shadow-lg shadow-amber-950/40">
            <BrainCircuit className="h-7 w-7" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
          </div>
          <div>
            <p className="text-xl font-black tracking-[0.22em] text-white">GXEON QG</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/70">QG Privado Operacional</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {cockpitGroups.map((group) => {
          const routes = group.ids
            .map((id) => gxeonNavigation.find((route) => route.id === id))
            .filter(Boolean) as typeof gxeonNavigation;

          return (
            <div key={group.title} className="space-y-2">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/55">{group.title}</p>
              {routes.map((route) => {
                const isActive = location === route.route;
                const Icon = route.icon;
                visibleIndex += 1;
                const isFuture = route.status === "future";
                return (
                  <Link key={route.route} href={route.route}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "group h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-stone-300 hover:border-amber-300/25 hover:bg-amber-400/10 hover:text-white",
                        isActive && "border-amber-300/45 bg-amber-400/15 text-white shadow-lg shadow-amber-950/25",
                        isFuture && "opacity-80",
                      )}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-100/10 bg-amber-100/[0.04] text-amber-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{String(visibleIndex).padStart(2, "0")} · {cockpitLabels[route.id] ?? route.name}</span>
                        <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-stone-500">{statusLabel[route.status ?? "operational"]}</span>
                      </span>
                      {isActive && <CircleDot className="h-3 w-3 text-emerald-300" />}
                    </Button>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <Link href={buildGxeonPlaceholderPath("command_center", "Private QG Safety Boundary")}>
        <div className="m-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 transition hover:border-amber-300/50 hover:bg-amber-400/15">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-amber-200" />
            <p className="text-xs uppercase tracking-[0.25em] text-amber-200/70">QG Privado</p>
          </div>
          <p className="mt-1 text-sm font-semibold text-white">Operação Manual · Conectores Controlados · sem segredos no frontend</p>
        </div>
      </Link>
    </aside>
  );
}
