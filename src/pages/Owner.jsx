import { useEffect, useRef, useState } from 'react'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLive, q, beep } from '../lib/useLive'
import { catOf, money, timeAgo, mapsLink, STATUS_LABEL, ACTIVE } from '../lib/constants'
import { StatusBadge, BottomNav, Stat, Img, Stars, Loading, Empty } from '../components/ui'
import { TopBar } from '../components/TopBar'
import { ShopForm, ProductForm } from '../components/forms'

const NEXT = {
  placed: ['accepted', 'Accept order'],
  accepted: ['packed', 'Mark packed / ready'],
  packed: ['out_for_delivery', 'Deliver myself'],
  out_for_delivery: ['delivered', 'Mark delivered'],
}

export default function Owner() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('orders')
  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const { data: shopRes, reload: reloadShop } = useLive(
    async () => ({ shop: await q(supabase.from('shops').select('*').eq('owner_id', profile.id).order('created_at').limit(1).maybeSingle()) }),
    [profile.id], ['shops'])
  const shop = shopRes?.shop
  const { data: orders } = useLive(
    () => shop?.id ? q(supabase.from('orders').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(300)) : [],
    [shop?.id], ['orders'])

  // beep when a new order arrives
  const lastNew = useRef(null)
  const newCount = (orders || []).filter((o) => o.status === 'placed').length
  useEffect(() => {
    if (lastNew.current !== null && newCount > lastNew.current) beep()
    lastNew.current = newCount
  }, [newCount])

  if (!shopRes) return <Loading />
  if (!shop) {
    return (
      <div className="app">
        <TopBar subtitle="Shop Partner" />
        <main className="page"><div className="warn">No shop found for your account. Create your shop below.</div><ShopForm onSaved={reloadShop} /></main>
      </div>
    )
  }

  const incomplete = !shop.lat || !shop.photo_url || !shop.address
  return (
    <div className="app">
      <TopBar subtitle="Shop Partner" />
      <main className="page">
        <div className="owner-head">
          <div className="row-left">
            <Img src={shop.photo_url} emoji={shop.icon} className="md round" />
            <div>
              <h2>{shop.name}</h2>
              <small className="muted">{catOf(shop.category).name} · <Stars value={shop.rating_avg} count={shop.rating_count} /></small>
            </div>
          </div>
          {shop.status === 'approved' && (
            <label className="switch-toggle">
              <input type="checkbox" checked={shop.open} onChange={async (e) => { await supabase.from('shops').update({ open: e.target.checked }).eq('id', shop.id); reloadShop() }} />
              <span className="slider" /><b>{shop.open ? 'OPEN' : 'CLOSED'}</b>
            </label>
          )}
        </div>

        {shop.status === 'pending' && (
          <div className="warn">⏳ <b>Waiting for admin approval.</b> {incomplete ? 'Complete your shop details (photo, location, address) in the Shop tab so admin can approve faster.' : 'Your details are complete. Admin will approve soon.'} You can add products meanwhile.</div>
        )}
        {shop.status === 'blocked' && <div className="error">⛔ Your shop is blocked by admin. Customers can't see it. Please contact Mana Bazar support.</div>}

        {tab === 'orders' && <Orders orders={orders} shop={shop} />}
        {tab === 'products' && <Products shop={shop} />}
        {tab === 'earnings' && <Earnings orders={orders || []} shop={shop} />}
        {tab === 'shop' && <ShopForm shop={shop} onSaved={() => { reloadShop(); alert('Saved ✓') }} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} items={[
        ['orders', '📥', 'Orders', newCount], ['products', '📦', 'Products'], ['earnings', '📊', 'Earnings'], ['shop', '🏪', 'Shop', incomplete ? '!' : 0],
      ]} />
    </div>
  )
}

function Orders({ orders, shop }) {
  const [filter, setFilter] = useState('active')
  if (!orders) return <Loading />
  const list = orders.filter((o) => (filter === 'active' ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status)))

  async function move(o, status) {
    let otp = null
    if (status === 'delivered') {
      otp = prompt('Enter the 4-digit delivery OTP from the customer')
      if (!otp) return
    }
    if (status === 'rejected' && !confirm('Reject this order?')) return
    const { error } = await supabase.rpc('update_order_status', { p_id: o.id, p_status: status, p_otp: otp })
    if (error) alert(errMsg(error))
  }

  return (
    <>
      <div className="chips">
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active ({orders.filter((o) => ACTIVE.includes(o.status)).length})</button>
        <button className={filter === 'past' ? 'active' : ''} onClick={() => setFilter('past')}>Completed</button>
      </div>
      {shop.status === 'approved' && !shop.open && <div className="warn">Your shop is CLOSED. Turn it ON to receive orders.</div>}
      {list.length === 0 && <Empty icon="📭" title={`No ${filter} orders`} sub={filter === 'active' ? 'New orders will appear here with a sound 🔔' : ''} />}
      {list.map((o) => {
        const next = NEXT[o.status]
        const waitingRider = o.status === 'packed' && !o.delivery_id
        const riderHasIt = o.status === 'out_for_delivery' && o.delivery_id
        return (
          <div key={o.id} className={'card order-card' + (o.status === 'placed' ? ' new' : '')}>
            <div className="row"><b>#{o.id}</b><StatusBadge s={o.status} /></div>
            <small className="muted">{timeAgo(o.created_at)} · {o.payment}</small>
            <ul className="items">
              {o.items.map((it) => <li key={it.id}><Img src={it.photo_url} emoji={it.emoji} className="xs" /> {it.name} <small>{it.unit}</small> × <b>{it.qty}</b><span>{money(it.price * it.qty)}</span></li>)}
            </ul>
            <div className="row"><span>👤 {o.customer_name} · <a href={`tel:${o.customer_phone}`}>📞 {o.customer_phone}</a></span><b>{money(o.total)}</b></div>
            <small className="muted">📍 {o.address} · <a href={mapsLink(o.lat, o.lng, o.address)} target="_blank" rel="noreferrer">Map</a></small>
            {o.note && <small className="note">📝 {o.note}</small>}
            {waitingRider && <small className="info">🛵 Waiting for a delivery partner to pick up… or deliver yourself.</small>}
            {riderHasIt && <small className="info">🛵 {o.delivery_name} ({o.delivery_phone}) is delivering this order.</small>}
            {next && !riderHasIt && (
              <div className="actions">
                {o.status === 'placed' && <button className="btn danger" onClick={() => move(o, 'rejected')}>Reject</button>}
                <button className="btn primary" onClick={() => move(o, next[0])}>{next[1]} →</button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function Products({ shop }) {
  const { data: products, reload } = useLive(
    () => q(supabase.from('products').select('*').eq('shop_id', shop.id).order('subcategory').order('name')), [shop.id], ['products'])
  const [edit, setEdit] = useState(null)
  const [text, setText] = useState('')
  if (!products) return <Loading />
  if (edit) return <ProductForm shop={shop} product={edit.id ? edit : null} onDone={() => { setEdit(null); reload() }} />

  const list = products.filter((p) => p.name.toLowerCase().includes(text.toLowerCase()))
  async function patch(p, row) {
    const { error } = await supabase.from('products').update(row).eq('id', p.id)
    if (error) alert(errMsg(error)); else reload()
  }
  async function del(p) {
    if (!confirm(`Delete ${p.name}?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) alert(errMsg(error)); else reload()
  }

  return (
    <>
      <div className="row">
        <h3 className="section-title">{products.length} products</h3>
        <button className="btn primary sm" onClick={() => setEdit({})}>+ Add product</button>
      </div>
      <div className="search"><span>🔍</span><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search your products" /></div>
      {list.length === 0 && <Empty icon="📦" title="No products yet" sub="Add products with photos and prices" />}
      <div className="plist">
        {list.map((p) => (
          <div key={p.id} className={'product' + (p.in_stock ? '' : ' oos')}>
            <Img src={p.photo_url} emoji={p.emoji} className="md" />
            <div className="p-info">
              <b>{p.name}</b>
              <small>{p.subcategory} · {p.unit}</small>
              <div><span className="price">{money(p.price)}</span>{p.mrp > p.price && <s>{money(p.mrp)}</s>}</div>
              {p.status !== 'approved' && <span className={'badge sh-' + (p.status === 'rejected' ? 'blocked' : 'pending')}>{p.status === 'pending' ? 'Waiting approval' : 'Rejected'}</span>}
            </div>
            <div className="p-actions">
              <label className="switch-toggle sm">
                <input type="checkbox" checked={p.in_stock} onChange={(e) => patch(p, { in_stock: e.target.checked })} />
                <span className="slider" /><small>{p.in_stock ? 'In stock' : 'Out'}</small>
              </label>
              <div>
                <button className="icon-btn" onClick={() => setEdit(p)}>✏️</button>
                <button className="icon-btn" onClick={() => del(p)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Earnings({ orders }) {
  const { data: settings } = useLive(() => q(supabase.from('settings').select('*').eq('id', 1).single()), [])
  if (!settings) return <Loading />
  const delivered = orders.filter((o) => o.status === 'delivered')
  const sales = delivered.reduce((s, o) => s + Number(o.item_total), 0)
  const commission = Math.round((sales * Number(settings.commission)) / 100)
  const today = new Date().toDateString()
  const todayDelivered = delivered.filter((o) => new Date(o.created_at).toDateString() === today)
  const todaySales = todayDelivered.reduce((s, o) => s + Number(o.item_total), 0)
  return (
    <>
      <div className="stats">
        <Stat icon="📅" label="Today's sales" value={money(todaySales)} tone="orange" />
        <Stat icon="🧾" label="Today's orders" value={todayDelivered.length} />
        <Stat icon="✅" label="Total delivered" value={delivered.length} tone="green" />
        <Stat icon="💰" label="Total sales" value={money(sales)} tone="green" />
      </div>
      <div className="card bill">
        <b>Settlement</b>
        <div><span>Sales (delivered orders)</span><span>{money(sales)}</span></div>
        <div><span>Mana Bazar commission ({settings.commission}%)</span><span>− {money(commission)}</span></div>
        <div className="total"><span>Your earnings</span><span>{money(sales - commission)}</span></div>
      </div>
      <h3 className="section-title">Orders by status</h3>
      <div className="card">
        {Object.keys(STATUS_LABEL).map((s) => {
          const n = orders.filter((o) => o.status === s).length
          return n ? <div key={s} className="row"><StatusBadge s={s} /><b>{n}</b></div> : null
        })}
        {orders.length === 0 && <small className="muted">No orders yet</small>}
      </div>
    </>
  )
}
