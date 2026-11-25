import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { currentPosition, searchPlaces, placeName } from '../lib/location'

const DEFAULT = { lat: 16.3067, lng: 80.4365 } // Guntur
const pin = L.divIcon({ className: 'map-pin', html: '📍', iconSize: [32, 32], iconAnchor: [16, 30] })

// Map with a draggable pin + "use my location" + search. onChange({lat, lng, area, label})
export default function LocationPicker({ value, onChange, height = 240 }) {
  const box = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const cb = useRef(onChange)
  cb.current = onChange
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState('')

  async function emit(lat, lng, label) {
    const p = await placeName(lat, lng)
    cb.current({ lat, lng, area: p.area, label: label || p.label })
  }
  function moveTo(lat, lng, zoom = 16) {
    marker.current?.setLatLng([lat, lng])
    map.current?.setView([lat, lng], zoom)
  }

  useEffect(() => {
    const start = value?.lat ? value : DEFAULT
    const m = L.map(box.current, { attributionControl: true }).setView([start.lat, start.lng], value?.lat ? 16 : 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m)
    const mk = L.marker([start.lat, start.lng], { draggable: true, icon: pin }).addTo(m)
    mk.on('dragend', () => { const p = mk.getLatLng(); emit(p.lat, p.lng) })
    m.on('click', (e) => { mk.setLatLng(e.latlng); emit(e.latlng.lat, e.latlng.lng) })
    map.current = m; marker.current = mk
    setTimeout(() => m.invalidateSize(), 200)
    return () => m.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function useMine() {
    setBusy('gps')
    try { const p = await currentPosition(); moveTo(p.lat, p.lng, 17); await emit(p.lat, p.lng) } catch (e) { alert(e.message) }
    setBusy('')
  }
  async function search(e) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy('search')
    try { setResults(await searchPlaces(q)) } catch { setResults([]) }
    setBusy('')
  }

  return (
    <div className="loc-picker">
      <button type="button" className="btn primary block" onClick={useMine} disabled={busy === 'gps'}>
        {busy === 'gps' ? 'Finding you…' : '🎯 Use my current location'}
      </button>
      <form className="loc-search" onSubmit={search}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search area, street, landmark…" />
        <button className="btn ghost sm">{busy === 'search' ? '…' : 'Search'}</button>
      </form>
      {results.length > 0 && (
        <div className="loc-results">
          {results.map((r, i) => (
            <button type="button" key={i} onClick={() => { moveTo(r.lat, r.lng); emit(r.lat, r.lng); setResults([]) }}>📍 {r.label}</button>
          ))}
        </div>
      )}
      <div ref={box} className="map" style={{ height }} />
      <small className="muted">Tap on the map or drag the 📍 pin to the exact spot.</small>
      {value?.label && <div className="loc-chosen">✅ {value.label}</div>}
    </div>
  )
}
