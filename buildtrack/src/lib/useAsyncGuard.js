import { useState } from 'react'

// Tracks a loading flag and refuses to start a second run while one is in
// flight — closes the double-submit race from a fast Enter key or click.
export function useAsyncGuard() {
  const [loading, setLoading] = useState(false)
  const guard = async (fn) => {
    if (loading) return
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }
  return [loading, guard]
}
