import { useState, useEffect } from 'react'
import {
  useStore, CATEGORIES, addToCart, cartTotals, placeOrder, setOrderStatus, updateUser,
  money, timeAgo, upiPayLink, upiQrImage, orderWhatsAppLink, distanceKm, etaWithDistance, slotLabel,
} from '../store'
import { StatusBadge, Tracker, BottomNav, useGeolocation } from './ui'
import Scanner from './Scanner'
import { LegalLinks, deletionRequestLinks } from './Legal'

// A shop QR poster opens the site as /?shop=<id>.
function shopFromUrl() {
  try { return new URLSearchParams(window.location.search).get('shop') } catch { return null }
}
// Pull a shop id out of a scanned Mana Bazar QR (full link or bare id).
function shopIdFromCode(code) {
  const m = /[?&]shop=([0-9a-f-]{36})/i.exec(code)
  return m ? m[1] : null
}

export default function Customer({ user }) {
  const { db, session } = useStore()
  const [tab, setTab] = useState('home')
  const [shopId, setShopId] = useState(shopFromUrl)
  const [cat, setCat] = useState(null)
  const [q, setQ] = useState('')
  const [trackId, setTrackId] = useState(null)

  useEffect(() => { window.scrollTo(0, 0) }, [tab, shopId, trackId])
  // Tidy the ?shop= link out of the address bar once it has been used.
  useEffect(() => {
    if (window.location.search.includes('shop=')) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const cartCount = session.cart ? session.cart.items.reduce((s, x) => s + x.qty, 0) : 0
  const go = (t) => { setTab(t); setShopId(null); setTrackId(null); window.scrollTo(0, 0) }

  let body
  if (shopId) body = <ShopPage db={db} cart={session.cart} shopId={shopId} back={() => setShopId(null)} />
  else if (trackId) body = <TrackOrder db={db} id={trackId} back={() => setTrackId(null)} />
  else if (tab === 'home') body = <Home db={db} user={user} cat={cat} setCat={setCat} q={q} setQ={setQ} openShop={setShopId} />
  else if (tab === 'cart') body = <Cart db={db} user={user} cart={session.cart} openShop={setShopId} onPlaced={(id) => { setTab('orders'); setTrackId(id) }} />
  else if (tab === 'orders') body = <MyOrders db={db} user={user} open={setTrackId} />
  else body = <Profile user={user} />

  return (
    <>
      <main className="page">{body}</main>
      {cartCount > 0 && tab !== 'cart' && (
        <button className="cart-bar" onClick={() => go('cart')}>
          <span>{cartCount} item{cartCount > 1 ? 's' : ''} · {money(cartTotals(session.cart, db.settings).itemTotal)}</span>
          <b>View Cart →</b>
        </button>
      )}
      <BottomNav tab={shopId || trackId ? '' : tab} setTab={go} items={[
        ['home', '🏠', 'Home'], ['cart', '🛒', `Cart${cartCount ? ` (${cartCount})` : ''}`], ['orders', '📦', 'Orders'], ['profile', '👤', 'Profile'],
      ]} />
    </>
  )
}

function Home({ db, user, cat, setCat, q, setQ, openShop }) {
  const geo = useGeolocation()
  const shops = db.shops.filter((s) => s.status === 'approved')
  const [scanning, setScanning] = useState(false)
  const query = q.trim().toLowerCase()
  const matchingProducts = query
    ? db.products.filter((p) => (p.name.toLowerCase().includes(query) || (p.barcode && p.barcode === q.trim())) && shops.some((s) => s.id === p.shopId))
    : []

  function onScan(code) {
    setScanning(false)
    const sid = shopIdFromCode(code)
    if (sid) {
      if (shops.some((s) => s.id === sid)) openShop(sid)
      else alert('This shop is not available right now.')
      return
    }
    if (/^https?:\/\//i.test(code)) return alert('This QR is not a Mana Bazar shop code.')
    setCat(null)
    setQ(code) // product barcode → shows every shop that sells it
  }
  let list = shops.filter((s) =>
    (!cat || s.category === cat) &&
    (!query || s.name.toLowerCase().includes(query) || matchingProducts.some((p) => p.shopId === s.id)))

  const withDistance = list.map((s) => ({
    ...s, km: geo.status === 'granted' ? distanceKm(geo.lat, geo.lng, s.lat, s.lng) : null,
  }))
  list = geo.status === 'granted'
    ? [...withDistance].sort((a, b) => (a.km ?? 999) - (b.km ?? 999))
    : withDistance

  return (
    <>
      <div className="deliver-to">📍 Deliver to <b>{user.address || 'Add address in Profile'}</b></div>
      {geo.status === 'denied' && (
        <div className="warn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Location off — shops sorted by name, not distance.</span>
          <button className="btn ghost sm" onClick={geo.retry}>Try again</button>
        </div>
      )}
      {geo.status === 'asking' && <div className="muted" style={{ padding: '8px 0' }}>📍 Finding shops near you…</div>}
      <div className="search">
        <span>🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shops, rice, medicines, cake..." />
        {q && <button onClick={() => setQ('')}>✕</button>}
        <button onClick={() => setScanning(true)} aria-label="Scan barcode or shop QR" title="Scan barcode or shop QR">📷</button>
      </div>
      {scanning && <Scanner title="Scan product barcode or shop QR" onResult={onScan} onClose={() => setScanning(false)} />}

      {!query && !cat && (
        <div className="banner">
          <div>
            <h3>Free delivery above {money(db.settings.freeDeliveryAbove)}</h3>
            <p>Groceries, medicines, bakery & more from your local shops</p>
          </div>
          <span>🛵</span>
        </div>
      )}

      <h3 className="section-title">Shop by Category</h3>
      <div className="cats">
        {CATEGORIES.map((c) => (
          <button key={c.id} className={'cat' + (cat === c.id ? ' active' : '')} style={{ background: c.color }} onClick={() => setCat(cat === c.id ? null : c.id)}>
            <span>{c.icon}</span>
            <small>{c.name}</small>
          </button>
        ))}
      </div>

      <h3 className="section-title">
        {cat ? CATEGORIES.find((c) => c.id === cat).name + ' near you' : query ? `Results for "${q}"` : 'All shops near you'}
        <small> · {list.length}</small>
      </h3>
      {list.length === 0 && <div className="empty">No shops found 😕</div>}
      <div className="shop-list">
        {list.map((s) => {
          const c = CATEGORIES.find((x) => x.id === s.category)
          const hits = matchingProducts.filter((p) => p.shopId === s.id)
          const etaWindow = etaWithDistance(s.eta, s.km)
          return (
            <button key={s.id} className={'shop-card' + (s.open ? '' : ' closed')} onClick={() => openShop(s.id)}>
              <div className="shop-img" style={{ background: c?.color }}>{s.icon}</div>
              <div className="shop-info">
                <b>{s.name}</b>
                <small>{c?.name} · {s.address}</small>
                <div className="meta">
                  <span className="rating">★ {s.rating}</span>
                  {s.km != null && <span>📍 {s.km < 1 ? Math.round(s.km * 1000) + ' m' : s.km.toFixed(1) + ' km'}</span>}
                  <span>🕒 by {slotLabel(etaWindow.max)}</span>
                  {!s.open && <span className="closed-tag">Closed now</span>}
                </div>
                {hits.length > 0 && <small className="hits">Has: {hits.slice(0, 3).map((p) => p.name).join(', ')}</small>}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function ShopPage({ db, cart, shopId, back }) {
  const shop = db.shops.find((s) => s.id === shopId)
  const [q, setQ] = useState('')
  if (!shop) return <><button className="back" onClick={back}>← Back</button><div className="empty">Shop not found</div></>
  const products = db.products.filter((p) => p.shopId === shopId && (p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode && p.barcode === q.trim())))
  const qty = (pid) => (cart?.shopId === shopId ? cart.items.find((x) => x.productId === pid)?.qty || 0 : 0)
  const c = CATEGORIES.find((x) => x.id === shop.category)

  return (
    <>
      <button className="back" onClick={back}>← Back</button>
      <div className="shop-head" style={{ background: c?.color }}>
        <div className="shop-img big">{shop.icon}</div>
        <div>
          <h2>{shop.name}</h2>
          <p>{c?.name} · {shop.address}</p>
          <div className="meta">
            <span className="rating">★ {shop.rating}</span>
            <span>🕒 {shop.eta}-{shop.eta + 10} min</span>
            <span>📞 {shop.phone}</span>
          </div>
        </div>
      </div>
      {!shop.open && <div className="warn">{shop.closedMessage || "This shop is closed right now. You can browse but can't order."}</div>}
      <div className="search"><span>🔍</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search in ${shop.name}`} /></div>
      <div className="products">
        {products.length === 0 && <div className="empty">No products yet</div>}
        {products.map((p) => {
          const n = qty(p.id)
          return (
            <div key={p.id} className={'product' + (p.inStock ? '' : ' oos')}>
              <div className="p-emoji">{p.emoji || '📦'}</div>
              <div className="p-info">
                <b>{p.name}</b>
                <small>{p.unit}</small>
                <div>
                  <span className="price">{money(p.price)}</span>
                  {p.mrp > p.price && <><s>{money(p.mrp)}</s><span className="off">{Math.round((1 - p.price / p.mrp) * 100)}% off</span></>}
                </div>
              </div>
              {!p.inStock ? <span className="oos-tag">Out of stock</span>
                : !shop.open ? null
                  : n === 0 ? <button className="btn add" onClick={() => addToCart(p, 1)}>ADD</button>
                    : (
                      <div className="qty">
                        <button onClick={() => addToCart(p, -1)}>−</button><b>{n}</b><button onClick={() => addToCart(p, 1)}>+</button>
                      </div>
                    )}
            </div>
          )
        })}
      </div>
      {cart?.shopId === shopId && <div style={{ height: 60 }} />}
    </>
  )
}

function Cart({ db, user, cart, openShop, onPlaced }) {
  const [address, setAddress] = useState(user.address || '')
  const [payment, setPayment] = useState('COD')
  const [note, setNote] = useState('')
  const [upiConfirmed, setUpiConfirmed] = useState(false)
  const [placing, setPlacing] = useState(false)
  if (!cart) return <div className="empty big">🛒<p>Your cart is empty</p><small>Add items from any shop to get started</small></div>

  const shop = db.shops.find((s) => s.id === cart.shopId)
  if (!shop) return <div className="empty big">🛒<p>This shop is no longer available</p><button className="btn" onClick={() => addToCart({ shopId: null }, 0)}>Clear cart</button></div>
  const t = cartTotals(cart, db.settings)
  const products = db.products
  const upiReady = payment !== 'UPI' || upiConfirmed

  async function order() {
    if (placing) return
    if (!address.trim()) return alert('Please enter delivery address')
    if (!shop.open) return alert('Shop is closed now')
    if (payment === 'UPI' && !upiConfirmed) return alert("Please confirm you've completed the UPI payment first")
    setPlacing(true)
    if (!user.address) updateUser(user.id, { address })
    const res = await placeOrder({ address, payment, note })
    setPlacing(false)
    if (res.error) return alert(res.error)
    onPlaced(res.id)
  }

  return (
    <>
      <h2 className="page-title">Your Cart</h2>
      <div className="card">
        <button className="link" onClick={() => openShop(shop.id)}>{shop.icon} <b>{shop.name}</b> — add more →</button>
        {cart.items.map((it) => {
          const p = products.find((x) => x.id === it.productId) || { id: it.productId, shopId: cart.shopId, ...it }
          return (
            <div key={it.productId} className="cart-row">
              <span>{it.emoji} {it.name} <small>{it.unit}</small></span>
              <div className="qty sm"><button onClick={() => addToCart(p, -1)}>−</button><b>{it.qty}</b><button onClick={() => addToCart(p, 1)}>+</button></div>
              <b>{money(it.price * it.qty)}</b>
            </div>
          )
        })}
      </div>
      <div className="card">
        <label>Delivery Address<textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        <label>Note for shop (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. less spicy, call before delivery" /></label>
        <div className="pay">
          {[['COD', '💵 Cash on Delivery'], ['UPI', '📱 Pay by UPI']].map(([v, l]) => (
            <label key={v} className={'radio' + (payment === v ? ' active' : '')}>
              <input type="radio" checked={payment === v} onChange={() => setPayment(v)} />{l}
            </label>
          ))}
        </div>
        {payment === 'UPI' && (
          <UpiCheckout shop={shop} amount={t.total} confirmed={upiConfirmed} setConfirmed={setUpiConfirmed} />
        )}
      </div>
      <div className="card bill">
        <div><span>Item total</span><span>{money(t.itemTotal)}</span></div>
        <div><span>Delivery fee</span><span>{t.deliveryFee ? money(t.deliveryFee) : <i className="free">FREE</i>}</span></div>
        {t.deliveryFee > 0 && <small>Add {money(db.settings.freeDeliveryAbove - t.itemTotal)} more for free delivery</small>}
        <div className="total"><span>To Pay</span><span>{money(t.total)}</span></div>
      </div>
      <button className="btn primary block lg" disabled={!upiReady || placing} onClick={order}>
        {placing ? 'Placing order…' : payment === 'UPI' && !upiConfirmed ? 'Confirm payment above first' : `Place Order · ${money(t.total)}`}
      </button>
    </>
  )
}

function UpiCheckout({ shop, amount, confirmed, setConfirmed }) {
  if (!shop.upiId) {
    return <div className="warn">This shop hasn't set up UPI yet — please choose Cash on Delivery.</div>
  }
  const link = upiPayLink({ upiId: shop.upiId, payeeName: shop.name, amount, orderId: shop.id })
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <p className="muted" style={{ marginTop: 0 }}>Scan with any UPI app, or tap to open one directly. Money goes straight to {shop.name} — Mana Bazar never holds it.</p>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <img src={upiQrImage(link)} alt="UPI QR code" width={140} height={140} style={{ borderRadius: 8, border: '1px solid #eee' }} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <a className="btn primary sm" href={link} style={{ display: 'inline-block', marginBottom: 8 }}>Open UPI app</a>
          <div><small className="muted">UPI ID: {shop.upiId}</small></div>
          <div><small className="muted">Amount: {money(amount)}</small></div>
        </div>
      </div>
      <label className="radio" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I've completed the UPI payment
      </label>
    </div>
  )
}

function MyOrders({ db, user, open }) {
  const orders = db.orders.filter((o) => o.customerId === user.id)
  if (!orders.length) return <div className="empty big">📦<p>No orders yet</p></div>
  return (
    <>
      <h2 className="page-title">My Orders</h2>
      {orders.map((o) => {
        const shop = db.shops.find((s) => s.id === o.shopId)
        return (
          <button key={o.id} className="card order-card" onClick={() => open(o.id)}>
            <div className="row"><b>{shop?.icon} {shop?.name}</b><StatusBadge s={o.status} /></div>
            <small>{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</small>
            <div className="row"><small>#{o.code} · {timeAgo(o.createdAt)}</small><b>{money(o.total)}</b></div>
          </button>
        )
      })}
    </>
  )
}

function TrackOrder({ db, id, back }) {
  const o = db.orders.find((x) => x.id === id)
  if (!o) return null
  const shop = db.shops.find((s) => s.id === o.shopId)
  return (
    <>
      <button className="back" onClick={back}>← Back</button>
      <div className="card">
        <div className="row"><h2>Order #{o.code}</h2><StatusBadge s={o.status} /></div>
        <p className="muted">{shop?.icon} {shop?.name} · 📞 {shop?.phone}</p>
        {o.status === 'delivered' && <div className="success">🎉 Delivered! Thank you for shopping with Mana Bazar.</div>}
        <Tracker o={o} />
        <small className="muted">Live updates: when the shop owner changes status, it shows here.</small>
        {o.status === 'placed' && (
          <a className="btn block" style={{ marginTop: 10, background: '#25D366', color: '#fff' }}
            href={orderWhatsAppLink(o, shop)} target="_blank" rel="noopener noreferrer">
            📲 Notify shop on WhatsApp
          </a>
        )}
      </div>
      <div className="card">
        {o.items.map((i) => <div key={i.productId} className="cart-row"><span>{i.emoji} {i.name} × {i.qty}</span><b>{money(i.price * i.qty)}</b></div>)}
        <div className="bill">
          <div><span>Delivery</span><span>{o.deliveryFee ? money(o.deliveryFee) : 'FREE'}</span></div>
          {o.discount > 0 && <div><span>Discount</span><span>− {money(o.discount)}</span></div>}
          <div className="total"><span>Total ({o.payment})</span><span>{money(o.total)}</span></div>
        </div>
        <p className="muted">📍 {o.address}</p>
        {o.note && <p className="muted">📝 {o.note}</p>}
      </div>
      {o.status === 'placed' && (
        <button className="btn danger block" onClick={() => confirm('Cancel this order?') && setOrderStatus(o.id, 'cancelled')}>Cancel Order</button>
      )}
    </>
  )
}

function Profile({ user }) {
  const [f, setF] = useState({ name: user.name, address: user.address || '' })
  const [saved, setSaved] = useState(false)
  return (
    <>
      <h2 className="page-title">My Profile</h2>
      <div className="card">
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Mobile<input value={user.phone} disabled /></label>
        <label>Delivery Address<textarea rows={3} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        <button className="btn primary" onClick={() => { updateUser(user.id, f); setSaved(true); setTimeout(() => setSaved(false), 1500) }}>
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      <DeleteMyAccount phone={user.phone} />
      <LegalLinks />
    </>
  )
}

// Play Store requires an in-app way to ask for account deletion.
export function DeleteMyAccount({ phone }) {
  const [open, setOpen] = useState(false)
  const l = deletionRequestLinks(phone)
  return (
    <div className="card" style={{ marginTop: 14 }}>
      {!open ? (
        <button className="btn ghost block" onClick={() => setOpen(true)}>Delete my account</button>
      ) : (
        <>
          <b>Delete your account?</b>
          <p className="muted" style={{ margin: '6px 0 10px' }}>
            Send us the request below. We delete your login, name, phone and address within 7 days.
            Order records needed for tax are kept as the law requires. <a href="/delete-account">Details</a>
          </p>
          <div className="actions">
            <a className="btn" href={l.whatsapp} target="_blank" rel="noreferrer">WhatsApp request</a>
            <a className="btn" href={l.mail}>Email request</a>
            <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}

