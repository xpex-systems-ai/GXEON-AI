import { createClient } from '@supabase/supabase-js'

// Edge Function para deduzir créditos - bypass PostgREST
Deno.serve(async (req) => {
  const { p_api_key, p_amount, p_operation, p_request_id } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Chamar a função RPC diretamente via SQL
  const { data, error } = await supabase.rpc('deduct_credits_atomic', {
    p_api_key,
    p_amount,
    p_operation,
    p_request_id
  })
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
