import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Lock, Eye, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dashboard Access
          </CardTitle>
          <CardDescription>
            This dashboard is read-only. All data comes from live Supabase connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>Read-Only Mode</span>
              </div>
              <Badge>Enabled</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>Real-time Updates</span>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span>Data Source</span>
              </div>
              <Badge variant="outline">Supabase Live</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About GXEON Dashboard</CardTitle>
          <CardDescription>
            Real-time revenue and commission tracking system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Version: 2.0.0</p>
            <p>Framework: Next.js 14 + Tailwind CSS</p>
            <p>Database: Supabase Realtime</p>
            <p>API: Railway Production</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
