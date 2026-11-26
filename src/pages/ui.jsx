import { useState, useEffect } from 'react'
import { ORDER_STEPS, STATUS_LABEL } from '../store'

// Browser geolocation, asked for once and cached in memory for the session.
// status: 'idle' | 'asking' | 'granted' | 'denied' | 'unsupported'
export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', lat: null, lng: null })

  function request() {
    if (!('geolocation' in navigator)) return setState({ status: 'unsupported', lat: null, lng: null })
    setState((s) => ({ ...s, status: 'asking' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setState({ status: 'denied', lat: null, lng: null }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60000 },
    )
  }

  // Ask once automatically on first mount of whichever screen uses this.
  useEffect(() => { request() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, retry: request }
}

export function StatusBadge({ s }) {
  return <span className={'badge st-' + s}>{STATUS_LABEL[s] || s}</span>
}

export function Tracker({ o }) {
  if (o.status === 'cancelled' || o.status === 'rejected') {
    return <div className="warn">This order was {o.status === 'cancelled' ? 'cancelled' : 'rejected by the shop'}.</div>
  }
  const cur = ORDER_STEPS.indexOf(o.status)
  return (
    <ol className="tracker">
      {ORDER_STEPS.map((st, i) => {
        const h = o.history.find((x) => x.status === st)
        return (
          <li key={st} className={i <= cur ? 'done' : ''}>
            <span className="dot">{i <= cur ? '✓' : ''}</span>
            <div>
              <b>{STATUS_LABEL[st]}</b>
              {h && <small>{new Date(h.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function BottomNav({ tab, setTab, items }) {
  return (
    <nav className="bottom-nav">
      {items.map(([id, icon, label]) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  )
}

export function Stat({ icon, label, value, tone }) {
  return (
    <div className={'stat ' + (tone || '')}>
      <span>{icon}</span>
      <div><b>{value}</b><small>{label}</small></div>
    </div>
  )
}
