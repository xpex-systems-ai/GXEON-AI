// MINIMAL VERSION - Building first, data later
export default function ActorsPage() {
  return (
    <div style={{padding: '20px', color: 'white'}}>
      <h1>Actors Ranking</h1>
      <p>Page loading...</p>
    </div>
  );
}

// Original code preserved below for reactivation:
/*
'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../dashboard-layout'
import { supabase, Actor } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Crown, Star } from 'lucide-react'

function OriginalActorsPage() {
  const [actors, setActors] = useState<Actor[]>([])
  const [wallets, setWallets] = useState<Record<string, { balance: number, total_earned: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActors()

    const channel = supabase
      .channel('actors-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actors' }, () => {
        fetchActors()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchActors() {
    const { data: actorsData } = await supabase
      .from('actors')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: walletsData } = await supabase
      .from('actor_wallets')
      .select('*')

    if (actorsData) {
      setActors(actorsData)
    }

    if (walletsData) {
      const walletMap = walletsData.reduce((acc: any, w) => {
        acc[w.actor_code] = { balance: w.balance, total_earned: w.total_earned }
        return acc
      }, {})
      setWallets(walletMap)
    }

    setLoading(false)
  }

  const tierIcons: Record<string, any> = {
    S: Crown,
    A: Star,
    B: Users,
    C: Users
  }

  const tierColors: Record<string, string> = {
    S: 'text-yellow-500',
    A: 'text-purple-500',
    B: 'text-blue-500',
    C: 'text-gray-500'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Actors Ranking</h1>

        <Card>
          <CardHeader>
            <CardTitle>All Actors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">Tier</th>
                    <th className="px-4 py-3 text-center">Commission</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Total Earned</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>
                  ) : actors.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No actors found</td></tr>
                  ) : (
                    actors.map((actor) => {
                      const wallet = wallets[actor.code] || { balance: 0, total_earned: 0 }
                      const TierIcon = tierIcons[actor.tier] || Users
                      return (
                        <tr key={actor.id} className="border-b border-muted hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">{actor.code}</td>
                          <td className="px-4 py-3">{actor.name}</td>
                          <td className="px-4 py-3 text-center">
                            <div className={`flex items-center justify-center gap-1 ${tierColors[actor.tier] || 'text-gray-500'}`}>
                              <TierIcon className="h-4 w-4" />
                              <span className="font-bold">{actor.tier}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{(actor.commission_rate * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(wallet.balance)}</td>
                          <td className="px-4 py-3 text-right text-green-500">{formatCurrency(wallet.total_earned)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                              actor.status === 'active' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {actor.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
