import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Generates a Paddle-hosted Customer Portal session so a foreman can cancel
// their subscription or update their card themselves — Paddle owns that UI
// (and PCI scope for the card form), we just hand back the session URL.
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')!
const PADDLE_API_BASE = Deno.env.get('PADDLE_ENV') === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('paddle_customer_id, paddle_subscription_id').eq('id', user.id).single()
    if (!profile?.paddle_customer_id) return new Response('No subscription on file', { status: 404 })

    const res = await fetch(`${PADDLE_API_BASE}/customers/${profile.paddle_customer_id}/portal-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(profile.paddle_subscription_id ? { subscription_ids: [profile.paddle_subscription_id] } : {}),
    })
    if (!res.ok) return new Response(await res.text(), { status: res.status })

    const { data } = await res.json()
    return new Response(JSON.stringify({ url: data.urls.general.overview }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
