import { createClient } from '@supabase/supabase-js'

// Safe initialization - only create client on browser or when env vars exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a dummy client for SSR/build time to prevent crashes
const createSafeClient = () => {
  if (typeof window === 'undefined' && (!supabaseUrl || !supabaseKey)) {
    // Return a mock client for server-side/build time
    return {
      from: () => ({
        select: () => ({ data: null, error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
      }),
      removeChannel: () => {},
    } as any
  }
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] Missing environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseKey
    })
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}

export const supabase = createSafeClient()

// Helper to check if supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseKey && supabaseUrl.startsWith('https://')
}

export type Transaction = {
  id: string
  mp_payment_id: string
  external_reference: string
  actor_code: string
  tier: string
  amount: number
  currency: string
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'REJECTED'
  payer_email: string
  payer_name: string
  created_at: string
  paid_at: string | null
}

export type Commission = {
  id: string
  transaction_id: string
  actor_id: string
  actor_code: string
  base_amount: number
  commission_rate: number
  commission_amount: number
  status: string
  created_at: string
  paid_at: string | null
}

export type ActorWallet = {
  id: string
  actor_id: string
  actor_code: string
  balance: number
  total_earned: number
  total_withdrawn: number
  pix_key: string | null
  pix_key_type: string | null
  updated_at: string
}

export type Actor = {
  id: string
  code: string
  name: string
  email: string
  commission_rate: number
  tier: string
  status: string
  created_at: string
}
