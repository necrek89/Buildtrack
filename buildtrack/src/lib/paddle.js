// Paddle.js is loaded via a <script> tag in index.html (same style as the
// service-worker registration already there) — this module only deals with
// initializing it and opening checkout. Every function here is a safe no-op
// until real Paddle env vars exist, so the billing UI can ship now without
// a live Paddle account.

const CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
const ENV = import.meta.env.VITE_PADDLE_ENV || 'sandbox'

const PRICE_IDS = {
  standard: {
    monthly: import.meta.env.VITE_PADDLE_PRICE_STANDARD_MONTHLY,
    annual:  import.meta.env.VITE_PADDLE_PRICE_STANDARD_ANNUAL,
  },
  pro: {
    monthly: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY,
    annual:  import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL,
  },
}

export function isPaddleConfigured() {
  return !!CLIENT_TOKEN
}

export function getPriceId(plan, period) {
  return PRICE_IDS[plan]?.[period] || null
}

let initialized = false
function ensureInitialized() {
  if (initialized || !isPaddleConfigured() || typeof window.Paddle === 'undefined') return initialized
  window.Paddle.Environment.set(ENV)
  window.Paddle.Initialize({ token: CLIENT_TOKEN })
  initialized = true
  return true
}

// Returns false (and does nothing) if Paddle isn't configured yet or this
// specific price id hasn't been set — callers should keep the triggering
// button disabled in that case rather than relying on this to fail loudly.
export function openCheckout(plan, period, profile) {
  const priceId = getPriceId(plan, period)
  if (!priceId || !ensureInitialized()) return false
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: profile?.email ? { email: profile.email } : undefined,
    customData: { profile_id: profile?.id },
  })
  return true
}
