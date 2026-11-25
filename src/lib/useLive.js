import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, errMsg } from './supabase'

// throw on Supabase error, return data
export async function q(promise) {
  const { data, error } = await promise
  if (error) throw error
  return data
}

// Fetch data and re-fetch whenever one of `tables` changes (Supabase realtime) + every 30s as backup
export function useLive(fetcher, deps, tables = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const fn = useRef(fetcher)
  fn.current = fetcher
  const reload = useCallback(async () => {
    try { setData(await fn.current()); setError('') } catch (e) { setError(errMsg(e)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { reload() }, [reload])
  const key = tables.join(',')
  useEffect(() => {
    if (!key) return
    const ch = supabase.channel('rt-' + key + '-' + Math.random().toString(36).slice(2))
    key.split(',').forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => reload()))
    ch.subscribe()
    const iv = setInterval(reload, 30000)
    return () => { supabase.removeChannel(ch); clearInterval(iv) }
  }, [key, reload])

  return { data, error, reload, loading: data === null && !error }
}

// short beep for new orders
export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.15
    o.start(); setTimeout(() => { o.frequency.value = 1175 }, 150); setTimeout(() => { o.stop(); ctx.close() }, 350)
  } catch { /* ignore */ }
}
