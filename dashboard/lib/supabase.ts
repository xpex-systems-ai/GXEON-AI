// GXEON Supabase Types and Utilities
// Components create Supabase client inline with error handling

export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && url.startsWith('https://')
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
