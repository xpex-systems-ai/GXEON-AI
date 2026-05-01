// MINIMAL VERSION - Building first, data later
export default function RevenuePage() {
  return (
    <div style={{padding: '20px', color: 'white'}}>
      <h1>Revenue Analytics</h1>
      <p>Page loading...</p>
    </div>
  );
}

// Original code preserved below for reactivation:
/*
'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '../dashboard-layout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import { TrendingUp, Calendar, DollarSign } from 'lucide-react'

// Dynamic import for Recharts to reduce bundle size
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

export default function RevenuePage() {
  const [data, setData] = useState({
    today: 0,
    week: 0,
    month: 0,
    byTier: [] as any[]
  })

  useEffect(() => {
    fetchRevenueData()
  }, [])

  async function fetchRevenueData() {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: todayTxs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'PAID')
      .gte('created_at', today)

    const { data: weekTxs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'PAID')
      .gte('created_at', weekAgo)

    const { data: monthTxs } = await supabase
      .from('transactions')
      .select('amount, tier')
      .eq('status', 'PAID')
      .gte('created_at', monthAgo)

    const byTier = monthTxs?.reduce((acc: any, tx) => {
      acc[tx.tier] = (acc[tx.tier] || 0) + tx.amount
      return acc
    }, {})

    setData({
      today: todayTxs?.reduce((s, t) => s + t.amount, 0) || 0,
      week: weekTxs?.reduce((s, t) => s + t.amount, 0) || 0,
      month: monthTxs?.reduce((s, t) => s + t.amount, 0) || 0,
      byTier: Object.entries(byTier || {}).map(([tier, amount]) => ({ tier, amount }))
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.today)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.week)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.month)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Tier (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byTier}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
