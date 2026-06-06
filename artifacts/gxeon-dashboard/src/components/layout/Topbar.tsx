import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildGxeonPlaceholderPath } from "@/data/gxeon-os";
import { Bell, Menu, Search, ShieldCheck, WifiOff, Zap } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-300/15 bg-slate-950/85 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={buildGxeonPlaceholderPath("command_center", "Mobile navigation")}>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Global Search")}>
            <div className="hidden rounded-2xl border border-cyan-300/15 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 md:flex md:min-w-[420px] md:items-center md:gap-3">
              <Search className="h-4 w-4 text-cyan-200" />
              Global search: módulos, widgets, agentes, integrações...
            </div>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "GXEON Status Visual Ready")}>
            <Badge className="hidden border-cyan-300/30 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/20 sm:inline-flex">GXEON STATUS · VISUAL READY</Badge>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href={buildGxeonPlaceholderPath("integrations", "APIs disabled")}>
            <Badge variant="outline" className="border-amber-300/40 text-amber-200 transition hover:bg-amber-400/10"><WifiOff className="mr-1 h-3 w-3" /> APIs disabled</Badge>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Safe preview")}>
            <Badge variant="outline" className="hidden border-emerald-300/40 text-emerald-200 transition hover:bg-emerald-400/10 md:inline-flex"><ShieldCheck className="mr-1 h-3 w-3" /> Safe preview</Badge>
          </Link>
          <Link href={buildGxeonPlaceholderPath("command_center", "Notification Center")}>
            <Button size="icon" variant="ghost" className="relative rounded-full border border-white/10 bg-white/[0.04]">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-fuchsia-300" />
            </Button>
          </Link>
          <Link href={buildGxeonPlaceholderPath("settings", "Operator profile")}>
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-yellow-300/30 hover:bg-yellow-400/10 lg:flex">
              <Zap className="h-4 w-4 text-yellow-200" />
              <div className="text-xs">
                <p className="font-semibold text-white">Junior Sena</p>
                <p className="text-slate-500">Admin · mock session</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
