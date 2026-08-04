import { supabase } from './supabase'

// Single source of truth for plan pricing/limits — reused by AccountPage's
// billing section and the landing page pricing modal so copy never drifts.
export const PLANS = {
  standard: { maxWorkers: 10, maxActiveProjects: 3, priceMonthly: 29, priceAnnual: 278.40 },
  pro:      { maxWorkers: null, maxActiveProjects: null, priceMonthly: 59, priceAnnual: 566.40 },
}

export function fmtPrice(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// Opens Paddle's hosted Customer Portal in a new tab, where the foreman can
// cancel their subscription or update their card — returns false if the
// portal couldn't be reached (no subscription on file, function error, etc).
export async function openBillingPortal() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paddle-portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return false
    const { url } = await res.json()
    if (!url) return false
    window.open(url, '_blank', 'noopener')
    return true
  } catch {
    return false
  }
}

const TRIAL_DAYS = 30
const LOCKED_STATUSES = ['canceled', 'paused']
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'] // past_due = grace period during Paddle's dunning retries

export function computeIsLocked({ trial_ends_at, subscription_status } = {}) {
  if (subscription_status && LOCKED_STATUSES.includes(subscription_status)) return true
  if (subscription_status && ACTIVE_STATUSES.includes(subscription_status)) return false
  if (!trial_ends_at) return false // never lock on missing/unbackfilled data
  return new Date(trial_ends_at).getTime() < Date.now()
}

export function getTrialDaysLeft({ trial_ends_at } = {}) {
  if (!trial_ends_at) return 0
  const ms = new Date(trial_ends_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

// Finds the foreman a worker/manager belongs to. Managers always land in
// project_workers directly; a worker can be in the crew via an approved
// join_requests row before being assigned to any project — mirrors the two
// sources _buildRoster() already combines, just from the opposite direction
// (one worker -> their one foreman, instead of one foreman -> all workers).
async function resolveForemanId(workerId) {
  const { data: pw } = await supabase
    .from('project_workers')
    .select('project:projects(foreman_id)')
    .eq('worker_id', workerId)
    .limit(1)
  const viaProject = pw?.[0]?.project?.foreman_id
  if (viaProject) return viaProject

  const { data: jr } = await supabase
    .from('join_requests')
    .select('foreman_id')
    .eq('worker_id', workerId)
    .eq('status', 'approved')
    .limit(1)
  return jr?.[0]?.foreman_id || null
}

// Called right after `profile` is fetched, from signIn/checkSession/fetchProfile.
// Returns { isLocked, billingForemanId, trialEndsAt } — trialEndsAt is only set
// when this call just backfilled it (so the caller can patch its local profile
// object without a second round-trip).
export async function resolveBillingState(profile) {
  if (!profile) return { isLocked: false, billingForemanId: null, trialEndsAt: null }

  if (profile.role === 'foreman') {
    let trialEndsAt = profile.trial_ends_at
    if (!trialEndsAt) {
      trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString()
      await supabase.from('profiles').update({ trial_ends_at: trialEndsAt }).eq('id', profile.id)
    }
    return {
      isLocked: computeIsLocked({ trial_ends_at: trialEndsAt, subscription_status: profile.subscription_status }),
      billingForemanId: profile.id,
      trialEndsAt,
    }
  }

  const foremanId = await resolveForemanId(profile.id)
  if (!foremanId) return { isLocked: false, billingForemanId: null, trialEndsAt: null }

  const { data: foreman } = await supabase
    .from('profiles')
    .select('trial_ends_at, subscription_status')
    .eq('id', foremanId)
    .single()

  return { isLocked: computeIsLocked(foreman || {}), billingForemanId: foremanId, trialEndsAt: null }
}
