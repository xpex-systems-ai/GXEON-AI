'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from './dashboard-layout'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Users,
  Activity,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardData {
  totalRevenue: number
  todayRevenue: number
  totalTransactions: number
  pendingTransactions: number
  conversionRate: number
  recentTransactions: any[]
  revenueChart: any[]
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    conversionRate: 0,
    recentTransactions: [],
    revenueChart: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configOk, setConfigOk] = useState(false)

  useEffect(() => {
    // Check if Supabase is configured
    const configured = isSupabaseConfigured()
    setConfigOk(configured)
    
    if (!configured) {
      setError('Supabase not configured. Check environment variables.')
      setLoading(false)
      return
    }
    
    fetchDashboardData()
    
    // Realtime subscriptions
    const channel = supabase
      .channel('dashboard-overview')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchDashboardData() {
    try {
      // Total Revenue (PAID only)
      const { data: paidTxs, error: paidError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID')
      
      if (paidError) throw paidError
      
      const totalRevenue = paidTxs?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0

      // Today's Revenue
      const today = new Date().toISOString().split('T')[0]
      const { data: todayTxs, error: todayError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID')
        .gte('created_at', today)
      
      if (todayError) throw todayError
      
      const todayRevenue = todayTxs?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0

      // Total Transactions
      const { count: totalTransactions, error: totalTransactionsError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      if (totalTransactionsError) throw totalTransactionsError

      // Pending Transactions
      const { count: pendingTransactions, error: pendingTransactionsError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING')

      if (pendingTransactionsError) throw pendingTransactionsError

      // Conversion Rate
      const { count: allCount, error: allCountError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      if (allCountError) throw allCountError

      const { count: paidCount, error: paidCountError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PAID')

      if (paidCountError) throw paidCountError

      const conversionRate = allCount && allCount > 0 
        ? ((paidCount || 0) / allCount) * 100 
        : 0

      // Recent Transactions
      const { data: recentTransactions, error: recentTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentTransactionsError) throw recentTransactionsError

      // Revenue Chart (last 7 days)
      const chartData = await fetchRevenueChart()

      setData({
        totalRevenue,
        todayRevenue,
        totalTransactions: totalTransactions || 0,
        pendingTransactions: pendingTransactions || 0,
        conversionRate,
        recentTransactions: recentTransactions || [],
        revenueChart: chartData
      })
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError(err?.message || 'Failed to load dashboard data')
      setLoading(false)
    }
  }

  async function fetchRevenueChart() {
    const days = 7
    const data = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const { data: dayTxs, error: dayTxsError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID')
        .gte('created_at', dateStr)
        .lt('created_at', dateStr + 'T23:59:59')

      if (dayTxsError) throw dayTxsError

      const dayRevenue = dayTxs?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0
      
      data.push({
        name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        revenue: dayRevenue
      })
    }
    
    return data
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md p-6 bg-card rounded-lg border">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Dashboard Error</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => { setLoading(true); setError(null); fetchDashboardData(); }}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                Retry
              </button>
              <a 
                href="/test"
                className="block w-full px-4 py-2 bg-secondary text-secondary-foreground rounded text-center"
              >
                Run Diagnostics
              </a>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Realtime Active</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                All time revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.todayRevenue)}</div>
              <div className="flex items-center text-xs">
                {data.todayRevenue > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">Active sales today</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No sales today</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {data.pendingTransactions} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                PAID / TOTAL ratio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-muted">
                      <td className="px-4 py-3 font-mono text-xs">
                        {tx.external_reference?.slice(0, 15)}...
                      </td>
                      <td className="px-4 py-3">{tx.actor_code}</td>
                      <td className="px-4 py-3">{formatCurrency(tx.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          tx.status === 'PAID' 
                            ? 'bg-green-500/20 text-green-400' 
                            : tx.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
