import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  DollarSign,
  CreditCard,
  Users,
  Wallet,
  Activity,
  Settings,
  Database,
  Key,
  Terminal,
  TrendingUp,
} from "lucide-react";

const routes = [
  { label: "Overview", icon: LayoutDashboard, href: "/" },
  { label: "Revenue", icon: DollarSign, href: "/revenue" },
  { label: "Revenue Streams", icon: TrendingUp, href: "/revenue-streams" },
  { label: "Transactions", icon: CreditCard, href: "/transactions" },
  { label: "Commissions", icon: Wallet, href: "/commissions" },
  { label: "Actors", icon: Users, href: "/actors" },
  { label: "Datasets", icon: Database, href: "/datasets" },
  { label: "API Keys", icon: Key, href: "/api-keys" },
  { label: "System Health", icon: Activity, href: "/health" },
  { label: "System Logs", icon: Terminal, href: "/system-logs" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full w-64 border-r bg-card">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">GX</span>
          </div>
          <span className="font-bold text-lg">GXEON</span>
        </Link>
      </div>
      <div className="flex-1 py-4 space-y-1 overflow-y-auto">
        {routes.map((route) => (
          <Link key={route.href} href={route.href}>
            <Button
              variant={location === route.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 px-6",
                location === route.href && "bg-secondary"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
