import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET   = Deno.env.get('PADDLE_WEBHOOK_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Reverse lookup: Paddle price id -> our internal {plan, plan_period}.
// Set once real price ids exist (`supabase secrets set PADDLE_PRICE_...`).
const PRICE_MAP: Record<string, { plan: string; plan_period: string }> = {}
for (const [plan, period] of [['standard', 'monthly'], ['standard', 'annual'], ['pro', 'monthly'], ['pro', 'annual']] as const) {
  const priceId = Deno.env.get(`PADDLE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}`)
  if (priceId) PRICE_MAP[priceId] = { plan, plan_period: period }
}

const LOCK_ONLY_STATUSES = new Set(['canceled', 'paused'])

async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!header) return false
  const parts = Object.fromEntries(header.split(';').map(p => p.split('=')))
  const ts = parts.ts
  const h1 = parts.h1
  if (!ts || !h1) return false

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}:${rawBody}`))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === h1
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, paddle-signature' } })
  }

  try {
    // Signature is computed over the raw body — must read as text BEFORE
    // any JSON.parse, or the HMAC will never match.
    const rawBody = await req.text()
    const valid = await verifySignature(rawBody, req.headers.get('paddle-signature'))
    if (!valid) return new Response('Invalid signature', { status: 401 })

    const event = JSON.parse(rawBody)
    const type = event.event_type
    const data = event.data

    if (!['subscription.created', 'subscription.updated', 'subscription.canceled', 'subscription.paused'].includes(type)) {
      return new Response('ok', { status: 200 }) // unhandled event — no-op, don't trigger retries
    }

    // Resolve which profile this subscription belongs to: primarily via the
    // custom_data set at checkout time, falling back to a previously-stored
    // paddle_customer_id for renewal-type events that may omit custom_data.
    let profileId: string | null = data?.custom_data?.profile_id || null
    if (!profileId && data?.customer_id) {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('paddle_customer_id', data.customer_id).single()
      profileId = existing?.id || null
    }
    if (!profileId) return new Response('No matching profile', { status: 200 })

    const status = data.status as string
    const update: Record<string, unknown> = {
      subscription_status: status,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
    }

    if (!LOCK_ONLY_STATUSES.has(status)) {
      const priceId = data.items?.[0]?.price?.id
      const mapped = priceId ? PRICE_MAP[priceId] : null
      if (mapped) { update.plan = mapped.plan; update.plan_period = mapped.plan_period }
      if (data.current_billing_period?.ends_at) update.subscription_current_period_end = data.current_billing_period.ends_at
    }

    await supabase.from('profiles').update(update).eq('id', profileId)
    return new Response('ok', { status: 200 })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
