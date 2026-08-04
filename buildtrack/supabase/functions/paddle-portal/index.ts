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

// Every response needs this, not just the OPTIONS preflight — the browser's
// fetch() throws before the caller ever sees the body/status if the actual
// response is missing it, even though the request itself succeeded.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: CORS })

    const { data: profile } = await supabase
      .from('profiles').select('paddle_customer_id, paddle_subscription_id').eq('id', user.id).single()
    if (!profile?.paddle_customer_id) return new Response('No subscription on file', { status: 404, headers: CORS })

    const res = await fetch(`${PADDLE_API_BASE}/customers/${profile.paddle_customer_id}/portal-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(profile.paddle_subscription_id ? { subscription_ids: [profile.paddle_subscription_id] } : {}),
    })
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS })

    const { data } = await res.json()
    return new Response(JSON.stringify({ url: data.urls.general.overview }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(String(e), { status: 500, headers: CORS })
  }
})
