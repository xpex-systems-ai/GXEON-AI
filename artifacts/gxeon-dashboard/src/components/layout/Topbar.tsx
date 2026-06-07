import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildGxeonPlaceholderPath } from "@/data/gxeon-os";
import { Bell, LockKeyhole, Menu, Search, ShieldCheck, WifiOff, Zap } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-amber-300/15 bg-[#050403]/90 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={buildGxeonPlaceholderPath("command_center", "Mobile navigation")}>
            <Button variant="ghost" size="icon" className="border border-amber-300/15 text-amber-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Private QG Search")}>
            <div className="hidden rounded-2xl border border-amber-300/15 bg-amber-100/[0.04] px-4 py-2 text-sm text-stone-300 transition hover:border-amber-300/40 hover:bg-amber-400/10 md:flex md:min-w-[420px] md:items-center md:gap-3">
              <Search className="h-4 w-4 text-amber-200" />
              Busca do QG: rotas, missões, tarefas, receita, conectores...
            </div>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Private QG Session")}>
            <Badge className="hidden border-amber-300/35 bg-amber-400/10 text-amber-100 transition hover:bg-amber-400/20 sm:inline-flex"><LockKeyhole className="mr-1 h-3 w-3" /> Private QG</Badge>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href={buildGxeonPlaceholderPath("integrations", "Controlled connectors")}>
            <Badge variant="outline" className="border-amber-300/40 text-amber-200 transition hover:bg-amber-400/10"><WifiOff className="mr-1 h-3 w-3" /> APIs disabled</Badge>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Safe Preview")}>
            <Badge variant="outline" className="hidden border-emerald-300/40 text-emerald-200 transition hover:bg-emerald-400/10 md:inline-flex"><ShieldCheck className="mr-1 h-3 w-3" /> Safe Preview</Badge>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Notification Center")}>
            <Button size="icon" variant="ghost" className="relative rounded-full border border-amber-100/10 bg-amber-100/[0.04] text-amber-100">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-300" />
            </Button>
          </Link>
          <Link href={buildGxeonPlaceholderPath("settings", "Operator profile")}>
            <div className="hidden items-center gap-2 rounded-2xl border border-amber-100/10 bg-amber-100/[0.04] px-3 py-2 transition hover:border-amber-300/30 hover:bg-amber-400/10 lg:flex">
              <Zap className="h-4 w-4 text-amber-200" />
              <div className="text-xs">
                <p className="font-semibold text-white">Operator: Junior Sena</p>
                <p className="text-stone-500">Sessão privada · manual-first</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
