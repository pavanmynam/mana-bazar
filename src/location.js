// Customer delivery location: GPS ("Use my current location") or an area the
// customer searches for. Saved on the phone and in the profile so shops are
// sorted by distance from where the customer actually wants delivery.
// Area names come from OpenStreetMap (Nominatim) — free, so we only call it on
// a tap / search button, never on every keystroke.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { updateUser } from './store'

const KEY = 'manabazar_location_v1'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
let current = read() // { lat, lng, label, source: 'gps'|'search', accuracy?, at }
const subs = new Set()
const emit = () => subs.forEach((f) => f())

export function useDeliveryLocation() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => current)
}

export function saveLocation(loc, userId) {
  current = { ...loc, at: Date.now() }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* private mode */ }
  emit()
  if (userId) updateUser(userId, { lat: loc.lat, lng: loc.lng })
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'
function shortLabel(a = {}, fallback = '') {
  const area = a.neighbourhood || a.suburb || a.quarter || a.residential || a.village || a.town || a.city_district || a.hamlet
  const city = a.city || a.town || a.county || a.state_district || a.state
  return [area, city].filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).join(', ') || fallback
}

export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=17&accept-language=en&lat=${lat}&lon=${lng}`)
    const j = await r.json()
    return shortLabel(j.address, j.display_name?.split(',').slice(0, 2).join(','))
  } catch { return '' }
}

export async function searchPlaces(q) {
  const r = await fetch(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&accept-language=en&q=${encodeURIComponent(q)}`)
  if (!r.ok) throw new Error('search failed')
  const list = await r.json()
  return list.map((p) => ({
    lat: Number(p.lat), lng: Number(p.lon),
    label: shortLabel(p.address, p.name),
    detail: p.display_name,
  }))
}

// Precise GPS fix (phones: real GPS; laptops: Wi-Fi/IP guess, can be far off).
export function gpsFix() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available on this device'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === 1
        ? 'Location permission is blocked. Allow location for this site in your browser settings, or search your area below.'
        : 'Could not get your location. Please search your area below.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

// Bottom sheet to set the delivery location.
export function LocationSheet({ userId, onClose, required }) {
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [pending, setPending] = useState(null) // gps result waiting for confirmation when inaccurate

  async function useGps() {
    setBusy('gps'); setMsg(''); setPending(null)
    try {
      const fix = await gpsFix()
      const label = (await reverseGeocode(fix.lat, fix.lng)) || 'Current location'
      const loc = { ...fix, label, source: 'gps' }
      if (fix.accuracy > 1500) {
        setPending(loc)
        setMsg(`This location is only accurate to about ${(fix.accuracy / 1000).toFixed(1)} km (computers guess from Wi-Fi). Is "${label}" right? If not, search your area below.`)
      } else {
        saveLocation(loc, userId); onClose()
      }
    } catch (e) { setMsg(e.message) }
    setBusy('')
  }
  async function search(e) {
    e.preventDefault()
    if (q.trim().length < 3) return setMsg('Type at least 3 letters, e.g. "Nagole" or "Bandlaguda Hyderabad"')
    setBusy('search'); setMsg('')
    try {
      const r = await searchPlaces(q.trim())
      setResults(r)
      if (!r.length) setMsg('No places found. Try area + city, e.g. "Kothapet Hyderabad".')
    } catch { setMsg('Search is not reachable right now. Please try again.') }
    setBusy('')
  }

  return (
    <div className="sheet-backdrop" onClick={required ? undefined : onClose}>
      <div className="sheet loc-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Delivery location">
        {!required && <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>}
        <h3>📍 Where should we deliver?</h3>
        <p className="muted">We show shops near this place first.</p>
        <button className="btn primary block" disabled={!!busy} onClick={useGps}>
          {busy === 'gps' ? 'Finding you…' : '🎯 Use my current location'}
        </button>
        {pending && (
          <div className="actions">
            <button className="btn" onClick={() => { saveLocation(pending, userId); onClose() }}>Yes, use {pending.label}</button>
          </div>
        )}
        <div className="or-line"><span>or search your area</span></div>
        <form className="promo-row" onSubmit={search}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Area / colony, e.g. Nagole" autoFocus={!required} />
          <button className="btn sm" disabled={!!busy}>{busy === 'search' ? '…' : 'Search'}</button>
        </form>
        {msg && <small className="error-text">{msg}</small>}
        {results && results.map((r) => (
          <button key={`${r.lat},${r.lng}`} className="loc-result" onClick={() => { saveLocation({ ...r, source: 'search' }, userId); onClose() }}>
            <b>📍 {r.label}</b><small>{r.detail}</small>
          </button>
        ))}
        <small className="muted osm">Map data © OpenStreetMap contributors</small>
      </div>
    </div>
  )
}

// Live "mm:ss" countdown helper.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}
