import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails('mailto:support@tutuu.net', VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const { user_id, title, body, url } = await req.json()
    if (!user_id || !title) return new Response('Missing fields', { status: 400 })

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)

    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })

    const payload = JSON.stringify({ title, body: body || '', url: url || '/app' })

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    // Remove expired subscriptions (410 Gone)
    const expired = subs.filter((_, i) => {
      const r = results[i]
      return r.status === 'rejected' && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)
    })
    if (expired.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired.map(s => s.endpoint))
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
