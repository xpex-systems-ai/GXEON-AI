// MINIMAL VERSION - Building first, data later
export default function CommissionsPage() {
  return (
    <div style={{padding: '20px', color: 'white'}}>
      <h1>Commissions</h1>
      <p>Page loading...</p>
    </div>
  )
}

// Original code preserved below for reactivation:
/*
'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../dashboard-layout'
import { supabase, Commission } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, TrendingUp } from 'lucide-react'

function OriginalCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommissions()

    const channel = supabase
      .channel('commissions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, () => {
        fetchCommissions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchCommissions() {
    const { data } = await supabase
      .from('commissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setCommissions(data)
      setStats({
        total: data.reduce((s, c) => s + c.commission_amount, 0),
        pending: data.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.commission_amount, 0),
        paid: data.filter(c => c.status === 'PAID').reduce((s, c) => s + c.commission_amount, 0)
      })
    }
    setLoading(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{formatCurrency(stats.pending)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(stats.paid)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Actor</th>
                    <th className="px-4 py-3 text-right">Base Amount</th>
                    <th className="px-4 py-3 text-center">Rate</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                  ) : commissions.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No commissions found</td></tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="border-b border-muted">
                        <td className="px-4 py-3">{c.actor_code}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(c.base_amount)}</td>
                        <td className="px-4 py-3 text-center">{(c.commission_rate * 100).toFixed(0)}%</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.commission_amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            c.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                      </tr>
                    ))
                  )
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
