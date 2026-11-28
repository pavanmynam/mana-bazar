import { useEffect, useRef, useState } from 'react'
import {
  useStore, reloadData, setRiderOnline, sendRiderLocation, acceptDelivery, setOrderStatus,
  money, timeAgo, distanceKm, STATUS_LABEL,
} from '../store'
import { BottomNav, StatusBadge, Stat } from './ui'
import { ChangePassword, DeleteMyAccount, FxSettings } from './Customer'
import { LegalLinks } from './Legal'
import { sfx } from '../fx'

// Rider app (Mee Bazar Delivery): go online → see packed orders nearby →
// accept → pick up at shop → deliver → collect cash for COD.
// While online the phone's GPS is sent every ~15 s so customers see the
// rider moving on their tracking map.
const DONE = ['delivered', 'cancelled', 'rejected']
const navUrl = (lat, lng, address) => lat != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`
const km = (d) => (d == null ? '' : d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`)

function useRiderGps(active) {
  const [pos, setPos] = useState(null)
  const [err, setErr] = useState('')
  const lastSent = useRef(0)
  useEffect(() => {
    if (!active) return
    if (!navigator.geolocation) { setErr('GPS not available on this phone'); return }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude }
        setPos(here); setErr('')
        if (Date.now() - lastSent.current > 15000) { lastSent.current = Date.now(); sendRiderLocation(here.lat, here.lng) }
      },
      (e) => setErr(e.code === 1 ? 'Location permission is blocked. Allow location for this site so customers can track you.' : 'Waiting for GPS signal…'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])
  return { pos, err }
}

export default function Delivery({ user }) {
  const { db } = useStore()
  const [tab, setTab] = useState('home')
  const me = db.partners.find((p) => p.id === user.id)
  const online = !!me?.online && !!me?.approved
  const { pos, err } = useRiderGps(online)

  const mine = db.orders.filter((o) => o.partnerId === user.id)
  const active = mine.filter((o) => !DONE.includes(o.status))
  const available = db.orders.filter((o) => !o.partnerId && ['accepted', 'packed'].includes(o.status))
  // Riders are not on the realtime feed (their GPS pings would reload every
  // screen), so the rider app refreshes the order list itself while online.
  useEffect(() => {
    if (!online) return
    const t = setInterval(() => reloadData(), 20000)
    return () => clearInterval(t)
  }, [online])
  const prevCount = useRef(available.length)
  useEffect(() => { if (online && available.length > prevCount.current) sfx.success(); prevCount.current = available.length }, [available.length, online])

  let body
  if (!me) {
    body = <div className="card center"><div className="logo-big">🛵</div><h2>Rider profile missing</h2><p>Please contact Mee Bazar support to finish your rider registration.</p></div>
  } else if (!me.approved) {
    body = (
      <div className="card center">
        <div className="logo-big">⏳</div>
        <h2>Waiting for approval</h2>
        <p>Thanks for joining Mee Bazar Delivery! Our team will verify your details and call you on <b>{user.phone}</b>.</p>
        <p className="muted">Vehicle: {me.vehicleType} · {me.vehicleNumber}</p>
        <button className="btn" onClick={() => reloadData()}>🔄 Check approval status</button>
      </div>
    )
  } else if (tab === 'home') {
    body = (
      <>
        <div className={'card rider-status ' + (online ? 'on' : 'off')}>
          <div>
            <b>{online ? '🟢 You are online' : '⚪ You are offline'}</b>
            <small>{online ? (err || (pos ? 'Sharing live location with customers' : 'Getting GPS…')) : 'Go online to receive delivery orders'}</small>
          </div>
          <button className={'btn ' + (online ? 'ghost' : 'primary')} onClick={() => {
            if (!online && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (p) => setRiderOnline(true, { lat: p.coords.latitude, lng: p.coords.longitude }),
                () => setRiderOnline(true), { enableHighAccuracy: true, timeout: 10000 })
            } else setRiderOnline(!online)
          }}>{online ? 'Go offline' : 'Go online'}</button>
        </div>

        {active.map((o) => <ActiveDelivery key={o.id} o={o} db={db} pos={pos} />)}

        {online && active.length === 0 && (
          <>
            <h3 className="section-title">📦 Orders waiting for a rider <small>· {available.length}</small></h3>
            {available.length === 0 && <div className="empty">No orders right now. Keep the app open — new orders appear here with a sound.</div>}
            {available
              .map((o) => {
                const s = db.shops.find((x) => x.id === o.shopId)
                return { o, s, toShop: pos && s ? distanceKm(pos.lat, pos.lng, s.lat, s.lng) : null, trip: s ? distanceKm(s.lat, s.lng, o.lat, o.lng) : null }
              })
              .sort((a, b) => (a.toShop ?? 99) - (b.toShop ?? 99))
              .map(({ o, s, toShop, trip }) => (
                <div key={o.id} className="card rider-job">
                  <div className="row"><b>{s?.icon} {s?.name}</b><StatusBadge s={o.status} /></div>
                  <small className="muted">{s?.address}</small>
                  <div className="job-meta">
                    {toShop != null && <span>🛵→🏪 {km(toShop)}</span>}
                    {trip != null && <span>🏪→🏠 {km(trip)}</span>}
                    <span>{o.items.reduce((n, i) => n + i.qty, 0)} items</span>
                    <span>{o.payment === 'COD' ? `💵 Collect ${money(o.total)}` : '✅ Prepaid'}</span>
                  </div>
                  <button className="btn primary block" onClick={async () => {
                    const e = await acceptDelivery(o.id)
                    if (e) alert(e); else sfx.add()
                  }}>Accept delivery</button>
                </div>
              ))}
          </>
        )}
      </>
    )
  } else if (tab === 'history') {
    const today = new Date().toDateString()
    const done = mine.filter((o) => o.status === 'delivered')
    const todays = done.filter((o) => new Date(o.deliveredAt || o.createdAt).toDateString() === today)
    const cash = todays.filter((o) => o.payment === 'COD').reduce((t, o) => t + o.total, 0)
    body = (
      <>
        <h2 className="page-title">My deliveries</h2>
        <div className="stats">
          <Stat icon="📦" label="Delivered today" value={todays.length} />
          <Stat icon="💰" label="Delivery fees today" value={money(todays.reduce((t, o) => t + o.deliveryFee, 0))} tone="green" />
          <Stat icon="💵" label="Cash collected today" value={money(cash)} />
          <Stat icon="🏆" label="All-time deliveries" value={done.length} />
        </div>
        {cash > 0 && <div className="warn">💵 Hand over {money(cash)} cash collected today to Mee Bazar / the shop as agreed.</div>}
        {mine.length === 0 && <div className="empty">No deliveries yet</div>}
        {mine.map((o) => {
          const s = db.shops.find((x) => x.id === o.shopId)
          return (
            <div key={o.id} className="card">
              <div className="row"><b>#{o.code} · {s?.name}</b><StatusBadge s={o.status} /></div>
              <small className="muted">{timeAgo(o.createdAt)} · {o.payment} · {money(o.total)}</small>
            </div>
          )
        })}
      </>
    )
  } else {
    body = (
      <>
        <h2 className="page-title">Profile</h2>
        <div className="card">
          <p><b>{user.name}</b> · {user.phone}</p>
          <p className="muted">Vehicle: {me.vehicleType} · {me.vehicleNumber}{me.license ? ` · DL ${me.license}` : ''}</p>
        </div>
        <FxSettings />
        <ChangePassword />
        <DeleteMyAccount phone={user.phone} />
        <LegalLinks />
      </>
    )
  }

  return (
    <>
      <main className="page">{body}</main>
      {me?.approved && (
        <BottomNav tab={tab} setTab={setTab} items={[
          ['home', '🛵', 'Deliveries'], ['history', '💰', 'Earnings'], ['profile', '👤', 'Profile'],
        ]} />
      )}
    </>
  )
}

function ActiveDelivery({ o, db, pos }) {
  const s = db.shops.find((x) => x.id === o.shopId)
  const c = db.users.find((u) => u.id === o.customerId)
  const atShop = ['accepted', 'packed'].includes(o.status)
  const step = async (status, msg) => {
    if (msg && !confirm(msg)) return
    await setOrderStatus(o.id, status)
    if (status === 'delivered') sfx.success()
  }
  const target = atShop ? { lat: s?.lat, lng: s?.lng, address: s?.address } : { lat: o.lat, lng: o.lng, address: o.address }
  const dist = pos && target.lat != null ? distanceKm(pos.lat, pos.lng, target.lat, target.lng) : null
  return (
    <div className="card rider-active">
      <div className="row"><b>Order #{o.code}</b><StatusBadge s={o.status} /></div>
      <div className="rider-step">
        <small>{atShop ? 'STEP 1 · PICK UP FROM SHOP' : 'STEP 2 · DELIVER TO CUSTOMER'}</small>
        <b>{atShop ? `${s?.icon} ${s?.name}` : `🏠 ${c?.name || 'Customer'}`}</b>
        <p className="muted">{target.address}</p>
        {dist != null && <small>📍 {km(dist)} away</small>}
        <div className="actions">
          <a className="btn" href={navUrl(target.lat, target.lng, target.address)} target="_blank" rel="noreferrer">🧭 Navigate</a>
          <a className="btn" href={`tel:${atShop ? s?.phone : c?.phone}`}>📞 Call {atShop ? 'shop' : 'customer'}</a>
        </div>
      </div>
      <details>
        <summary>{o.items.reduce((n, i) => n + i.qty, 0)} items · {money(o.total)}</summary>
        {o.items.map((i) => <div key={i.productId} className="row"><small>{i.name} × {i.qty}</small><small>{money(i.price * i.qty)}</small></div>)}
        {o.note && <p className="muted">📝 {o.note}</p>}
      </details>
      {o.payment === 'COD' && o.status !== 'delivered' && <div className="warn">💵 Collect <b>{money(o.total)}</b> cash from the customer</div>}
      {atShop && o.status === 'accepted' && <small className="muted">Shop is packing. You can pick up once it's ready.</small>}
      {atShop && <button className="btn primary block" onClick={() => step('picked_up', o.status !== 'packed' ? 'Shop has not marked this packed yet. Picked up anyway?' : null)}>✅ Picked up from shop</button>}
      {o.status === 'picked_up' && <button className="btn primary block" onClick={() => step('out_for_delivery')}>🛵 Start delivery</button>}
      {o.status === 'out_for_delivery' && (
        <button className="btn primary block" onClick={() => step('delivered', o.payment === 'COD' ? `Collected ${money(o.total)} cash and delivered?` : 'Order handed over to the customer?')}>
          🎉 Mark delivered
        </button>
      )}
      <small className="muted">{STATUS_LABEL[o.status]}</small>
    </div>
  )
}
