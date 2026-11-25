import { useEffect, useRef, useState } from 'react'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLive, q, beep } from '../lib/useLive'
import { currentPosition } from '../lib/location'
import { money, timeAgo, mapsLink, distanceKm, kmText } from '../lib/constants'
import { StatusBadge, BottomNav, Stat, Loading, Empty } from '../components/ui'
import { TopBar } from '../components/TopBar'

export default function Delivery() {
  const { profile, updateProfile } = useAuth()
  const [tab, setTab] = useState('available')
  const [me, setMe] = useState(profile.lat ? { lat: profile.lat, lng: profile.lng } : null)
  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const { data } = useLive(async () => {
    const [orders, settings] = await Promise.all([
      q(supabase.from('orders').select('*').or(`delivery_id.eq.${profile.id},and(status.eq.packed,delivery_id.is.null)`).order('created_at', { ascending: false }).limit(300)),
      q(supabase.from('settings').select('*').eq('id', 1).single()),
    ])
    const shopIds = [...new Set(orders.map((o) => o.shop_id))]
    const shops = shopIds.length ? await q(supabase.from('shops').select('id,name,phone,address,area,lat,lng,icon').in('id', shopIds)) : []
    return { orders, settings, shops: Object.fromEntries(shops.map((s) => [s.id, s])) }
  }, [profile.id], ['orders'])

  const available = (data?.orders || []).filter((o) => o.status === 'packed' && !o.delivery_id)
  const lastCount = useRef(null)
  useEffect(() => {
    if (profile.online && lastCount.current !== null && available.length > lastCount.current) beep()
    lastCount.current = available.length
  }, [available.length, profile.online])

  if (profile.status === 'pending') {
    return (
      <div className="app"><TopBar subtitle="Delivery Partner" />
        <main className="page"><div className="card center">
          <div className="empty-ico">⏳</div><h2>Waiting for approval</h2>
          <p>Thanks for joining, {profile.name}! Mana Bazar admin will verify and approve your account soon.</p>
        </div></main>
      </div>
    )
  }

  async function goOnline(v) {
    try {
      if (v) { const p = await currentPosition().catch(() => null); if (p) { setMe(p); await updateProfile({ online: true, lat: p.lat, lng: p.lng }); return } }
      await updateProfile({ online: v })
    } catch (e) { alert(errMsg(e)) }
  }

  async function act(o, status) {
    let otp = null
    if (status === 'delivered') {
      otp = prompt('Ask the customer for the 4-digit delivery OTP')
      if (!otp) return
    }
    const { error } = await supabase.rpc('update_order_status', { p_id: o.id, p_status: status, p_otp: otp })
    if (error) alert(errMsg(error)); else if (status === 'out_for_delivery') setTab('active')
  }

  const mine = (data?.orders || []).filter((o) => o.delivery_id === profile.id)
  const active = mine.filter((o) => o.status === 'out_for_delivery')
  const done = mine.filter((o) => o.status === 'delivered')
  const pay = Number(data?.settings?.delivery_pay || 0)

  return (
    <div className="app">
      <TopBar subtitle="Delivery Partner" />
      <main className="page">
        <div className="owner-head">
          <div><h2>🛵 {profile.name}</h2><small className="muted">{profile.vehicle} · {profile.phone}</small></div>
          <label className="switch-toggle">
            <input type="checkbox" checked={!!profile.online} onChange={(e) => goOnline(e.target.checked)} />
            <span className="slider" /><b>{profile.online ? 'ONLINE' : 'OFFLINE'}</b>
          </label>
        </div>
        {!data ? <Loading /> : (
          <>
            {tab === 'available' && (!profile.online
              ? <Empty icon="😴" title="You are offline" sub="Go ONLINE to see orders ready for pickup" />
              : available.length === 0 ? <Empty icon="📭" title="No orders ready for pickup" sub="New orders will appear here with a sound 🔔" />
                : available.map((o) => <OrderCard key={o.id} o={o} shop={data.shops[o.shop_id]} me={me} pay={pay}
                  action={<button className="btn primary block" onClick={() => act(o, 'out_for_delivery')}>✅ Accept & pick up · earn {money(pay)}</button>} />))}
            {tab === 'active' && (active.length === 0 ? <Empty icon="🛵" title="No active deliveries" /> :
              active.map((o) => <OrderCard key={o.id} o={o} shop={data.shops[o.shop_id]} me={me} pay={pay} full
                action={<button className="btn primary block" onClick={() => act(o, 'delivered')}>🔐 Enter OTP & mark delivered</button>} />))}
            {tab === 'earnings' && (
              <>
                <div className="stats">
                  <Stat icon="📅" label="Today's deliveries" value={done.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length} />
                  <Stat icon="✅" label="Total deliveries" value={done.length} tone="green" />
                  <Stat icon="💰" label={`Earnings (${money(pay)}/order)`} value={money(done.length * pay)} tone="orange" />
                  <Stat icon="💵" label="Cash collected (COD)" value={money(done.filter((o) => o.payment === 'COD').reduce((s, o) => s + Number(o.total), 0))} />
                </div>
                <h3 className="section-title">Delivered orders</h3>
                {done.map((o) => (
                  <div key={o.id} className="card row"><span>#{o.id} · {data.shops[o.shop_id]?.name}<br /><small className="muted">{timeAgo(o.created_at)} · {o.payment}</small></span><b>{money(o.total)}</b></div>
                ))}
              </>
            )}
          </>
        )}
      </main>
      <BottomNav tab={tab} setTab={setTab} items={[
        ['available', '📥', 'New', profile.online ? available.length : 0], ['active', '🛵', 'Active', active.length], ['earnings', '💰', 'Earnings'],
      ]} />
    </div>
  )
}

function OrderCard({ o, shop, me, pay, full, action }) {
  const toShop = distanceKm(me, shop)
  const shopToCust = distanceKm(shop, o)
  return (
    <div className="card order-card">
      <div className="row"><b>#{o.id} · {money(o.total)} <small className="muted">{o.payment}</small></b><StatusBadge s={o.status} /></div>
      <div className="route">
        <div className="stop">
          <span className="stop-dot pick">P</span>
          <div><b>{shop?.icon} {shop?.name}</b><small>{shop?.address || shop?.area}</small>
            <div className="links">
              {toShop != null && <small>{kmText(toShop)} from you</small>}
              <a href={mapsLink(shop?.lat, shop?.lng, shop?.address)} target="_blank" rel="noreferrer">🗺️ Directions</a>
              {shop?.phone && <a href={`tel:${shop.phone}`}>📞 Call shop</a>}
            </div>
          </div>
        </div>
        <div className="stop">
          <span className="stop-dot drop">D</span>
          <div><b>👤 {full ? o.customer_name : 'Customer'}</b><small>{o.address}</small>
            <div className="links">
              {shopToCust != null && <small>{kmText(shopToCust)} from shop</small>}
              {full && <a href={mapsLink(o.lat, o.lng, o.address)} target="_blank" rel="noreferrer">🗺️ Directions</a>}
              {full && <a href={`tel:${o.customer_phone}`}>📞 Call customer</a>}
            </div>
          </div>
        </div>
      </div>
      <small className="muted">{o.items.reduce((s, i) => s + i.qty, 0)} items · {timeAgo(o.created_at)} · You earn {money(pay)}</small>
      {o.payment === 'COD' && full && <div className="warn">💵 Collect {money(o.total)} cash from customer</div>}
      {o.note && <small className="note">📝 {o.note}</small>}
      <div className="mt">{action}</div>
    </div>
  )
}
