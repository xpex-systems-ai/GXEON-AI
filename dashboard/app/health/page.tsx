// MINIMAL VERSION - Building first, data later
export default function HealthPage() {
  return (
    <div style={{padding: '20px', color: 'white'}}>
      <h1>System Health</h1>
      <p>Page loading...</p>
    </div>
  );
}

// Original code preserved below for reactivation:
/*
'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Database, Server, Wifi, AlertCircle, CheckCircle } from 'lucide-react'

function OriginalHealthPage() {
  const [status, setStatus] = useState({
    api: { status: 'checking', message: 'Checking...' },
    supabase: { status: 'checking', message: 'Checking...' },
    realtime: { status: 'checking', message: 'Checking...' }
  })

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  async function checkHealth() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-ia-production.up.railway.app'

    // Check API
    try {
      const apiRes = await fetch(`${apiBase}/health`, { method: 'GET' })
      setStatus(s => ({
        ...s,
        api: { status: apiRes.ok ? 'healthy' : 'error', message: apiRes.ok ? 'Online' : 'Error' }
      }))
    } catch {
      setStatus(s => ({ ...s, api: { status: 'error', message: 'Offline' } }))
    }

    // Check Supabase via simple query
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error } = await supabase.from('transactions').select('count', { count: 'exact', head: true })
      setStatus(s => ({
        ...s,
        supabase: { status: error ? 'error' : 'healthy', message: error ? 'Error' : 'Connected' }
      }))
    } catch {
      setStatus(s => ({ ...s, supabase: { status: 'error', message: 'Offline' } }))
    }

    // Check Realtime (simplified)
    setStatus(s => ({
      ...s,
      realtime: { status: 'healthy', message: 'Active' }
    }))
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'healthy') return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === 'error') return <AlertCircle className="h-5 w-5 text-red-500" />
    return <Activity className="h-5 w-5 text-yellow-500 animate-pulse" />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Railway API</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon status={status.api.status} />
                <span className="font-medium capitalize">{status.api.message}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Backend services status</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Supabase</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon status={status.supabase.status} />
                <span className="font-medium capitalize">{status.supabase.message}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Database connection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Realtime</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon status={status.realtime.status} />
                <span className="font-medium capitalize">{status.realtime.message}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Live data updates</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="text-sm">NEXT_PUBLIC_SUPABASE_URL</span>
                <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'default' : 'destructive'}>
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'default' : 'destructive'}>
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <span className="text-sm">NEXT_PUBLIC_API_BASE</span>
                <Badge variant={process.env.NEXT_PUBLIC_API_BASE ? 'default' : 'destructive'}>
                  {process.env.NEXT_PUBLIC_API_BASE ? 'Set' : 'Missing'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
