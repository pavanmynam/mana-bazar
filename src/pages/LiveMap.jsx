import { useEffect, useRef, useState } from 'react'

// Order tracking map (Zepto/Swiggy style): shop → customer's home with the
// rider in between. Uses Leaflet + free OpenStreetMap tiles, loaded from a CDN
// only when a map is opened, so the main app stays small.
// `rider` = live GPS from the delivery partner app when available; otherwise
// the rider position is estimated from the order's progress.
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

let leafletReady = null
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  leafletReady ||= new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'; css.href = LEAFLET_CSS
    document.head.appendChild(css)
    const js = document.createElement('script')
    js.src = LEAFLET_JS
    js.onload = () => resolve(window.L)
    js.onerror = () => { leafletReady = null; reject(new Error('map failed to load')) }
    document.head.appendChild(js)
  })
  return leafletReady
}

const pin = (L, emoji, cls) => L.divIcon({ className: 'map-pin ' + cls, html: `<span>${emoji}</span>`, iconSize: [40, 40], iconAnchor: [20, 36] })

export default function LiveMap({ shop, home, status, progress = 0, rider = null }) {
  const box = useRef(null)
  const map = useRef(null)
  const riderMarker = useRef(null)
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)
  const ok = shop?.lat != null && home?.lat != null

  // Where the rider is: live GPS, or a point along the route by progress.
  const moving = ['picked_up', 'out_for_delivery'].includes(status)
  const riderPos = rider?.lat != null ? [rider.lat, rider.lng]
    : !ok ? null
      : status === 'delivered' ? [home.lat, home.lng]
        : moving ? (() => {
          const t = Math.min(0.95, Math.max(0.05, progress))
          return [shop.lat + (home.lat - shop.lat) * t, shop.lng + (home.lng - shop.lng) * t]
        })()
          : [shop.lat, shop.lng]

  useEffect(() => {
    if (!ok) return
    let dead = false
    loadLeaflet().then((L) => {
      if (dead || !box.current || map.current) return
      const m = L.map(box.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(m)
      const a = [shop.lat, shop.lng], b = [home.lat, home.lng]
      L.polyline([a, b], { color: '#ff5722', weight: 4, dashArray: '8 8', opacity: 0.8 }).addTo(m)
      L.marker(a, { icon: pin(L, shop.icon || '🏪', 'shop') }).addTo(m).bindTooltip(shop.name)
      L.marker(b, { icon: pin(L, '🏠', 'home') }).addTo(m).bindTooltip('Your location')
      m.fitBounds(L.latLngBounds([a, b]).pad(0.35))
      map.current = m
      setLoaded(true)
    }).catch(() => setErr('Map could not load. The countdown below still works.'))
    return () => { dead = true; if (map.current) { map.current.remove(); map.current = null; riderMarker.current = null; setLoaded(false) } }
  }, [ok, shop?.lat, shop?.lng, home?.lat, home?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Move the rider smoothly whenever the position changes.
  useEffect(() => {
    const L = window.L
    if (!loaded || !L || !map.current || !riderPos) return
    if (!riderMarker.current) riderMarker.current = L.marker(riderPos, { icon: pin(L, '🛵', 'rider'), zIndexOffset: 500 }).addTo(map.current)
    else riderMarker.current.setLatLng(riderPos)
  })

  if (!ok) return null
  return (
    <div className="live-map">
      <div ref={box} className="live-map-box" />
      {err && <small className="muted">{err}</small>}
      {!rider && moving && <small className="map-note">Rider position is estimated</small>}
    </div>
  )
}
