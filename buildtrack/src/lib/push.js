import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushPermission() {
  return Notification.permission // 'granted' | 'denied' | 'default'
}

export async function subscribeToPush(userId) {
  if (!await isPushSupported()) return { error: 'Push not supported' }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
    } catch {
      return { error: 'Permission denied' }
    }
  }

  const { endpoint, keys } = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }, { onConflict: 'user_id,endpoint' })

  return { error: error?.message || null }
}

export async function unsubscribeFromPush(userId) {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}

export async function isSubscribed() {
  if (!await isPushSupported()) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}
