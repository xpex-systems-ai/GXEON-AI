import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Dashboard Access</CardTitle>
          <CardDescription>This dashboard is read-only. All data comes from live Supabase connection.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { icon: Eye, label: "Read-Only Mode", badge: "Enabled", variant: "default" as const },
              { icon: Lock, label: "Real-time Updates", badge: "Active", variant: "secondary" as const },
              { icon: Database, label: "Data Source", badge: "Supabase Live", variant: "outline" as const },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2"><item.icon className="h-4 w-4 text-muted-foreground" /><span>{item.label}</span></div>
                <Badge variant={item.variant}>{item.badge}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>About GXEON Dashboard</CardTitle>
          <CardDescription>Real-time revenue and commission tracking system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Version: 2.0.0</p>
            <p>Framework: Vite + React + Tailwind CSS</p>
            <p>Database: Supabase Realtime</p>
            <p>Platform: Replit</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
