import { useSyncExternalStore } from 'react'

// Customer's chosen delivery location (saved on device)
const KEY = 'mb_location_v1'
const listeners = new Set()
let loc = read()
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
export function setLocation(l) {
  loc = l
  try { localStorage.setItem(KEY, JSON.stringify(l)) } catch { /* ignore */ }
  listeners.forEach((f) => f())
}
export const useLocation = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => loc)

export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location not supported on this device'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Please allow location permission')),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })
}

// OpenStreetMap search (free) – India only
export async function searchPlaces(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=6&q=${encodeURIComponent(q)}`)
  const j = await r.json()
  return j.map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), label: x.display_name }))
}
export async function placeName(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat=${lat}&lon=${lng}`)
    const j = await r.json()
    const a = j.address || {}
    const area = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || ''
    const city = a.city || a.town || a.county || a.state_district || ''
    return { area, label: [area, city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(', ') || j.display_name || '' }
  } catch {
    return { area: '', label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
  }
}
