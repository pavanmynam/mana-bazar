import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import {
  useStore, CATEGORIES, addToCart, cartTotals, placeOrder, setOrderStatus, updateUser,
  availablePromos, checkPromo, paymentsConfig, payOnline, fetchShopReviews, fetchOrderReview, submitReview, changeMyPassword,
  money, timeAgo, upiPayLink, upiQrImage, orderWhatsAppLink, distanceKm, etaWithDistance, slotLabel,
} from '../store'
import { StatusBadge, Tracker, BottomNav } from './ui'
import { useDeliveryLocation, LocationSheet, useNow, gpsFix, reverseGeocode, saveLocation } from '../location'
import Scanner from './Scanner'
import { sfx, fxPrefs, setFxPref } from '../fx'
import { buildIndex, searchProducts, shopMatches } from '../search'
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
  else if (tab === 'home') body = <Home db={db} user={user} cart={session.cart} cat={cat} setCat={setCat} q={q} setQ={setQ} openShop={setShopId} />
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

function Home({ db, user, cart, cat, setCat, q, setQ, openShop }) {
  const loc = useDeliveryLocation()
  const here = loc || (user.lat != null ? { lat: user.lat, lng: user.lng, label: 'Saved location' } : null)
  const [locOpen, setLocOpen] = useState(false)
  const [locBusy, setLocBusy] = useState(false)
  // First time after login: ask the phone for its location automatically.
  useEffect(() => {
    if (loc) return
    let done = false
    try { done = sessionStorage.getItem('mb_auto_loc') === '1'; sessionStorage.setItem('mb_auto_loc', '1') } catch { /* ignore */ }
    if (done) return
    setLocBusy(true)
    gpsFix().then(async (fix) => {
      const label = (await reverseGeocode(fix.lat, fix.lng)) || 'Current location'
      if (fix.accuracy <= 1500) saveLocation({ ...fix, label, source: 'gps' }, user.id)
      else setLocOpen(true) // laptop Wi-Fi guess: let the customer confirm or search
    }).catch(() => setLocOpen(true)).finally(() => setLocBusy(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const shops = useMemo(() => db.shops.filter((s) => s.status === 'approved'), [db.shops])
  const [scanning, setScanning] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const dq = useDeferredValue(q)
  const query = dq.trim()
  const openIds = useMemo(() => new Set(shops.map((s) => s.id)), [shops])
  const index = useMemo(() => buildIndex(db.products.filter((p) => openIds.has(p.shopId)), shops, CATEGORIES), [db.products, shops, openIds])
  const barcodeHits = query ? db.products.filter((p) => p.barcode && p.barcode === query && openIds.has(p.shopId)) : []
  const matchingProducts = query ? [...barcodeHits, ...searchProducts(index, query).map((r) => r.p).filter((p) => !barcodeHits.includes(p))] : []
  useEffect(() => { setShowAll(false) }, [query])

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
  const hitShops = new Set(matchingProducts.map((p) => p.shopId))
  let list = shops.filter((s) =>
    (!cat || s.category === cat) &&
    (!query || hitShops.has(s.id) || shopMatches(s, query, CATEGORIES)))

  const withDistance = list.map((s) => ({
    ...s, km: here ? distanceKm(here.lat, here.lng, s.lat, s.lng) : null,
  }))
  list = here
    ? [...withDistance].sort((a, b) => (a.km ?? 999) - (b.km ?? 999))
    : withDistance

  return (
    <>
      <button className="deliver-to" onClick={() => setLocOpen(true)}>
        <span className="loc-pin">📍</span>
        <span className="loc-text">
          <small>Deliver to</small>
          <b>{locBusy ? 'Finding your location…' : here ? here.label : 'Set your location'}</b>
        </span>
        <span className="loc-change">{here ? 'Change' : 'Set'} ▾</span>
      </button>
      {!here && (
        <div className="warn loc-ask">
          <span>Set your delivery location to see the nearest shops first.</span>
          <button className="btn primary sm" onClick={() => setLocOpen(true)}>📍 Allow location</button>
        </div>
      )}
      {locOpen && <LocationSheet userId={user.id} onClose={() => setLocOpen(false)} />}
      <div className="search">
        <span>🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rice, బియ్యం, pappu, medicines, shop name…" />
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

      {query && (() => {
        const km = new Map(list.map((s) => [s.id, s.km]))
        const shopOf = new Map(shops.map((s) => [s.id, s]))
        // Best match first; among equal matches, open shops and nearer shops first.
        const ranked = matchingProducts
          .filter((p) => !cat || shopOf.get(p.shopId)?.category === cat)
          .map((p, i) => ({ p, i, s: shopOf.get(p.shopId), km: km.get(p.shopId) ?? null }))
          .sort((a, b) => (Math.floor(a.i / 12) - Math.floor(b.i / 12)) || ((b.s?.open ? 1 : 0) - (a.s?.open ? 1 : 0)) || ((a.km ?? 999) - (b.km ?? 999)) || (a.p.price - b.p.price))
        const shown = showAll ? ranked.slice(0, 120) : ranked.slice(0, 15)
        return (
          <>
            <h3 className="section-title">🛍️ Items near you <small>· {ranked.length >= 200 ? '200+' : ranked.length}</small></h3>
            {ranked.length === 0 && <div className="empty">No items found for "{q}". Try another word — Telugu or English both work.</div>}
            <div className="products">
              {shown.map(({ p, s, km: d }) => (
                <SearchHit key={p.id} p={p} s={s} km={d} cart={cart} openShop={openShop} />
              ))}
            </div>
            {ranked.length > shown.length && <button className="btn ghost block" onClick={() => setShowAll(true)}>Show more items</button>}
          </>
        )
      })()}

      <h3 className="section-title">
        {cat ? CATEGORIES.find((c) => c.id === cat).name + ' near you' : query ? `Shops for "${q}"` : 'All shops near you'}
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
              <div className="shop-img" style={{ background: c?.color }}>{s.photoUrl ? <img src={s.photoUrl} alt="" loading="lazy" /> : s.icon}</div>
              <div className="shop-info">
                <b>{s.name}</b>
                <small>{c?.name} · {s.address}</small>
                <div className="meta">
                  <span className="rating">★ {s.rating}</span>
                  {s.km != null && <span>📍 {s.km < 1 ? Math.round(s.km * 1000) + ' m' : s.km.toFixed(1) + ' km'}</span>}
                  <span>🕒 by {slotLabel(etaWindow.max)}</span>
                  {!s.open && <span className="closed-tag">Closed now</span>}
                </div>
                {s.notice && <small className="offer-tag">📢 {s.notice}</small>}
                {hits.length > 0 && <small className="hits">Has: {hits.slice(0, 3).map((p) => p.name).join(', ')}</small>}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function SearchHit({ p, s, km, cart, openShop }) {
  const n = cart?.shopId === p.shopId ? cart.items.find((x) => x.productId === p.id)?.qty || 0 : 0
  return (
    <div className={'product tap search-hit' + (p.inStock ? '' : ' oos')} onClick={() => openShop(p.shopId)}>
      {p.images[0] ? <img className="p-img" src={p.images[0]} alt="" loading="lazy" /> : <div className="p-emoji">{p.emoji || '📦'}</div>}
      <div className="p-info">
        <b>{p.name}</b>
        <small>{p.unit}</small>
        {p.offer && <span className="offer-tag">🏷️ {p.offer}</span>}
        <div><span className="price">{money(p.price)}</span>{p.mrp > p.price && <s>{money(p.mrp)}</s>}</div>
        <small className="hit-shop">{s?.icon} {s?.name}{km != null ? ` · 📍 ${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'}` : ''}{s && !s.open ? ' · Closed now' : ''}</small>
      </div>
      {!p.inStock ? <span className="oos-tag">Out of stock</span>
        : !s?.open ? null
          : n === 0 ? <button className="btn add" onClick={(e) => { e.stopPropagation(); addToCart(p, 1) }}>ADD</button>
            : (
              <div className="qty" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => addToCart(p, -1)}>−</button><b key={n}>{n}</b><button onClick={() => addToCart(p, 1)}>+</button>
              </div>
            )}
    </div>
  )
}

function ShopPage({ db, cart, shopId, back }) {
  const shop = db.shops.find((s) => s.id === shopId)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [detail, setDetail] = useState(null)
  if (!shop) return <><button className="back" onClick={back}>← Back</button><div className="empty">Shop not found</div></>
  const all = db.products.filter((p) => p.shopId === shopId)
  const types = [...new Set(all.map((p) => p.type).filter(Boolean))]
  const query = q.trim().toLowerCase()
  const products = all.filter((p) => (!type || p.type === type) &&
    (!query || p.name.toLowerCase().includes(query) || (p.type || '').toLowerCase().includes(query) || (p.barcode && p.barcode === q.trim())))
  const qty = (pid) => (cart?.shopId === shopId ? cart.items.find((x) => x.productId === pid)?.qty || 0 : 0)
  const c = CATEGORIES.find((x) => x.id === shop.category)
  // Show products grouped under their type, like sections in Zepto/Instamart.
  const groups = types.length && !type && !query
    ? [...types.map((t) => [t, products.filter((p) => p.type === t)]), ['Other', products.filter((p) => !p.type)]].filter(([, l]) => l.length)
    : [['', products]]

  const addControls = (p) => {
    const n = qty(p.id)
    return !p.inStock ? <span className="oos-tag">Out of stock</span>
      : !shop.open ? null
        : n === 0 ? <button className="btn add" onClick={(e) => { e.stopPropagation(); addToCart(p, 1) }}>ADD</button>
          : (
            <div className="qty" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => addToCart(p, -1)}>−</button><b key={n}>{n}</b><button onClick={() => addToCart(p, 1)}>+</button>
            </div>
          )
  }

  return (
    <>
      <button className="back" onClick={back}>← Back</button>
      {shop.photoUrl && <img className="shop-cover" src={shop.photoUrl} alt={shop.name} />}
      <div className="shop-head" style={{ background: c?.color }}>
        <div className="shop-img big">{shop.icon}</div>
        <div>
          <h2>{shop.name}</h2>
          <p>{c?.name} · {shop.address}</p>
          <div className="meta">
            <span className="rating">★ {shop.rating}{shop.ratingCount ? ` (${shop.ratingCount})` : ''}</span>
            <span>🕒 {shop.eta}-{shop.eta + 10} min</span>
            <span>📞 {shop.phone}</span>
          </div>
        </div>
      </div>
      {shop.notice && <div className="shop-notice">📢 {shop.notice}</div>}
      {shop.description && <p className="shop-about">{shop.description}</p>}
      {!shop.open && <div className="warn">{shop.closedMessage || "This shop is closed right now. You can browse but can't order."}</div>}
      <div className="search"><span>🔍</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search in ${shop.name}`} /></div>
      {types.length > 1 && (
        <div className="chips scroll">
          <button className={!type ? 'active' : ''} onClick={() => setType('')}>All ({all.length})</button>
          {types.map((t) => <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>{t}</button>)}
        </div>
      )}
      {products.length === 0 && <div className="empty">No products found</div>}
      {groups.map(([g, list]) => (
        <section key={g || 'all'}>
          {g && <h3 className="section-title">{g} <small className="muted">({list.length})</small></h3>}
          <div className="products">
            {list.map((p) => (
              <div key={p.id} className={'product tap' + (p.inStock ? '' : ' oos')} onClick={() => setDetail(p)}>
                {p.images[0] ? <img className="p-img" src={p.images[0]} alt="" loading="lazy" /> : <div className="p-emoji">{p.emoji || '📦'}</div>}
                <div className="p-info">
                  <b>{p.name}</b>
                  <small>{p.unit}</small>
                  {p.offer && <span className="offer-tag">🏷️ {p.offer}</span>}
                  <div>
                    <span className="price">{money(p.price)}</span>
                    {p.mrp > p.price && <><s>{money(p.mrp)}</s><span className="off">{Math.round((1 - p.price / p.mrp) * 100)}% off</span></>}
                  </div>
                </div>
                {addControls(p)}
              </div>
            ))}
          </div>
        </section>
      ))}
      {detail && <ProductDetail p={db.products.find((x) => x.id === detail.id) || detail} controls={addControls} onClose={() => setDetail(null)} />}
      <ShopReviews shopId={shopId} count={shop.ratingCount} />
      {cart?.shopId === shopId && <div style={{ height: 60 }} />}
    </>
  )
}

function ProductDetail({ p, controls, onClose }) {
  const [i, setI] = useState(0)
  const imgs = p.images || []
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        {imgs.length ? (
          <>
            <img className="sheet-img" src={imgs[Math.min(i, imgs.length - 1)]} alt={p.name} />
            {imgs.length > 1 && (
              <div className="sheet-thumbs">
                {imgs.map((u, k) => <img key={u} src={u} alt="" className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}
              </div>
            )}
          </>
        ) : <div className="sheet-emoji">{p.emoji || '📦'}</div>}
        <h3>{p.name}</h3>
        <p className="muted">{p.unit}{p.type ? ` · ${p.type}` : ''}</p>
        {p.offer && <span className="offer-tag">🏷️ {p.offer}</span>}
        <div className="row">
          <div>
            <span className="price big">{money(p.price)}</span>
            {p.mrp > p.price && <><s>{money(p.mrp)}</s><span className="off">{Math.round((1 - p.price / p.mrp) * 100)}% off</span></>}
          </div>
          {controls(p)}
        </div>
        {p.description && <p className="sheet-desc">{p.description}</p>}
        {p.stockQty != null && p.stockQty <= 5 && p.inStock && <small className="error-text">Only {p.stockQty} left</small>}
      </div>
    </div>
  )
}

function Cart({ db, user, cart, openShop, onPlaced }) {
  const [address, setAddress] = useState(user.address || '')
  const [payment, setPayment] = useState('COD')
  const [note, setNote] = useState('')
  const [upiConfirmed, setUpiConfirmed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [promo, setPromo] = useState(null) // { code, discount, description }
  const dloc = useDeliveryLocation()
  const [online, setOnline] = useState(false)
  useEffect(() => { paymentsConfig().then((c) => setOnline(!!c.enabled)) }, [])
  if (!cart) return <div className="empty big">🛒<p>Your cart is empty</p><small>Add items from any shop to get started</small></div>

  const shop = db.shops.find((s) => s.id === cart.shopId)
  if (!shop) return <div className="empty big">🛒<p>This shop is no longer available</p><button className="btn" onClick={() => addToCart({ shopId: null }, 0)}>Clear cart</button></div>
  const base = cartTotals(cart, db.settings)
  // Drop the preview if the cart no longer meets the code's rules; the server re-checks anyway.
  const discount = promo ? Math.min(promo.discount, base.itemTotal) : 0
  const t = { ...base, discount, total: base.total - discount }
  const products = db.products
  const upiReady = payment !== 'UPI' || upiConfirmed

  async function order() {
    if (placing) return
    if (!address.trim()) return alert('Please enter delivery address')
    if (!shop.open) return alert('Shop is closed now')
    if (payment === 'UPI' && !upiConfirmed) return alert("Please confirm you've completed the UPI payment first")
    setPlacing(true)
    if (!user.address) updateUser(user.id, { address })
    const res = await placeOrder({ address, payment, note, promoCode: promo?.code, lat: dloc?.lat ?? user.lat, lng: dloc?.lng ?? user.lng })
    setPlacing(false)
    if (res.error) {
      if (/promo/i.test(res.error)) setPromo(null)
      return alert(res.error)
    }
    if (payment === 'RAZORPAY') {
      const p = await payOnline(res.id)
      if (p.error) alert(p.error)
    }
    sfx.success()
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
          {[['COD', '💵 Cash on Delivery'], ...(online ? [['RAZORPAY', '💳 Pay online (UPI / Card / Netbanking)']] : []), ['UPI', '📱 Pay shop directly by UPI']].map(([v, l]) => (
            <label key={v} className={'radio' + (payment === v ? ' active' : '')}>
              <input type="radio" checked={payment === v} onChange={() => setPayment(v)} />{l}
            </label>
          ))}
        </div>
        {payment === 'UPI' && (
          <UpiCheckout shop={shop} amount={t.total} confirmed={upiConfirmed} setConfirmed={setUpiConfirmed} />
        )}
      </div>
      <PromoBox shopId={shop.id} itemTotal={base.itemTotal} promo={promo} setPromo={setPromo} />
      <div className="card bill">
        <div><span>Item total</span><span>{money(t.itemTotal)}</span></div>
        <div><span>Delivery fee</span><span>{t.deliveryFee ? money(t.deliveryFee) : <i className="free">FREE</i>}</span></div>
        {t.discount > 0 && <div className="discount"><span>Promo {promo.code}</span><span>− {money(t.discount)}</span></div>}
        {t.deliveryFee > 0 && <small>Add {money(db.settings.freeDeliveryAbove - t.itemTotal)} more for free delivery</small>}
        <div className="total"><span>To Pay</span><span>{money(t.total)}</span></div>
      </div>
      <button className="btn primary block lg" disabled={!upiReady || placing} onClick={order}>
        {placing ? 'Placing order…' : payment === 'UPI' && !upiConfirmed ? 'Confirm payment above first' : payment === 'RAZORPAY' ? `Place Order & Pay · ${money(t.total)}` : `Place Order · ${money(t.total)}`}
      </button>
    </>
  )
}

function PromoBox({ shopId, itemTotal, promo, setPromo }) {
  const [code, setCode] = useState('')
  const [offers, setOffers] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { availablePromos(shopId).then(setOffers) }, [shopId])
  // Re-check when the cart total changes (e.g. items removed below the minimum).
  useEffect(() => {
    if (!promo) return
    checkPromo(promo.code, shopId, itemTotal).then((r) => {
      if (r.error) { setPromo(null); setMsg(r.error) } else if (r.discount !== promo.discount) setPromo(r)
    })
  }, [itemTotal]) // eslint-disable-line react-hooks/exhaustive-deps

  async function apply(c) {
    setBusy(true); setMsg('')
    const r = await checkPromo(c, shopId, itemTotal)
    setBusy(false)
    if (r.error) { setMsg(r.error); return }
    setPromo(r); setCode('')
  }

  if (promo) {
    return (
      <div className="card promo applied">
        <span>🎉 <b>{promo.code}</b> applied — you save <b>{money(promo.discount)}</b></span>
        <button className="btn ghost sm" onClick={() => { setPromo(null); setMsg('') }}>Remove</button>
      </div>
    )
  }
  return (
    <div className="card promo">
      <b>🏷️ Promo code</b>
      <form className="promo-row" onSubmit={(e) => { e.preventDefault(); apply(code) }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code e.g. WELCOME50" />
        <button className="btn sm" disabled={busy || !code.trim()}>{busy ? '…' : 'Apply'}</button>
      </form>
      {msg && <small className="error-text">{msg}</small>}
      {offers.length > 0 && (
        <div className="offers">
          {offers.map((o) => (
            <button key={o.code} type="button" className="offer" onClick={() => apply(o.code)}>
              <b>{o.code}</b><small>{o.description || (o.discount_type === 'flat' ? `${money(o.value)} off` : `${Number(o.value)}% off`)}{Number(o.min_order) > 0 ? ` · min ${money(o.min_order)}` : ''}</small>
            </button>
          ))}
        </div>
      )}
    </div>
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
            <div className="row"><b>{shop?.icon} {shop?.name}</b><span><EtaChip o={o} shop={shop} /> <StatusBadge s={o.status} /></span></div>
            <small>{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</small>
            <div className="row"><small>#{o.code} · {timeAgo(o.createdAt)}</small><b>{money(o.total)}</b></div>
          </button>
        )
      })}
    </>
  )
}

// Expected arrival = order time + shop's packing time + travel time by distance.
function orderEta(o, shop) {
  const km = shop ? distanceKm(o.lat, o.lng, shop.lat, shop.lng) : null
  const mins = etaWithDistance(shop?.eta ?? 30, km).max
  return { mins, due: o.createdAt + mins * 60000 }
}
const ACTIVE = ['placed', 'accepted', 'packed', 'picked_up', 'out_for_delivery']
const STEP_TEXT = {
  placed: 'Waiting for the shop to accept…', accepted: 'Shop accepted — packing your items', packed: 'Packed — waiting for pickup',
  picked_up: 'Picked up — on the way', out_for_delivery: 'Out for delivery — almost there!',
}

function OrderTimer({ o, shop }) {
  const now = useNow(1000)
  if (o.status === 'delivered') {
    const at = o.deliveredAt || o.history.find((h) => h.status === 'delivered')?.at
    return at ? <div className="timer done">✅ Delivered in <b>{Math.max(1, Math.round((at - o.createdAt) / 60000))} min</b></div> : null
  }
  if (!ACTIVE.includes(o.status)) return null
  const { mins, due } = orderEta(o, shop)
  const left = due - now
  const pct = Math.min(100, Math.max(3, ((now - o.createdAt) / (mins * 60000)) * 100))
  const mm = Math.floor(Math.abs(left) / 60000), ss = Math.floor((Math.abs(left) % 60000) / 1000)
  return (
    <div className={'timer' + (left < 0 ? ' late' : '')}>
      <small>{STEP_TEXT[o.status]}</small>
      {left >= 0
        ? <div className="timer-clock">{String(mm).padStart(2, '0')}<span>:</span>{String(ss).padStart(2, '0')}<small>min left</small></div>
        : <div className="timer-clock small">Running ~{mm + 1} min late</div>}
      <div className="timer-bar"><i style={{ width: pct + '%' }} /></div>
      <small>Expected by <b>{new Date(due).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</b>{left < 0 ? ' · Shop is on it, sorry for the wait' : ''}</small>
    </div>
  )
}

function EtaChip({ o, shop }) {
  const now = useNow(30000)
  if (!ACTIVE.includes(o.status)) return null
  const left = Math.round((orderEta(o, shop).due - now) / 60000)
  return <span className="eta-chip">⏱ {left > 0 ? `${left} min` : 'arriving'}</span>
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
        <OnlinePaymentStatus o={o} />
        <OrderTimer o={o} shop={shop} />
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
      {o.status === 'delivered' && <ReviewBox order={o} shop={shop} />}
      {o.status === 'placed' && (
        <button className="btn danger block" onClick={() => confirm('Cancel this order?') && setOrderStatus(o.id, 'cancelled')}>Cancel Order</button>
      )}
    </>
  )
}

const STARS = [1, 2, 3, 4, 5]
function Stars({ value, onPick, size = 26 }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {STARS.map((n) => (
        <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)} aria-label={`${n} star`}
          className={n <= value ? 'on' : ''}>★</button>
      ))}
    </span>
  )
}

function OnlinePaymentStatus({ o }) {
  const [busy, setBusy] = useState(false)
  if (o.payment !== 'RAZORPAY') return null
  const closed = ['cancelled', 'rejected'].includes(o.status)
  if (o.paymentStatus === 'paid') {
    return <div className="success">✅ Paid online{closed ? ' — refund will reach your account in 5–7 working days.' : ''}</div>
  }
  if (closed) return null
  async function pay() {
    setBusy(true)
    const r = await payOnline(o.id)
    setBusy(false)
    if (r.error) alert(r.error)
  }
  return (
    <div className="warn">
      ⏳ Payment pending — the shop starts packing after you pay.
      <button className="btn primary block" style={{ marginTop: 8 }} disabled={busy} onClick={pay}>{busy ? 'Opening…' : `Pay now · ${money(o.total)}`}</button>
    </div>
  )
}

function ReviewBox({ order, shop }) {
  const [existing, setExisting] = useState(undefined) // undefined = loading
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { fetchOrderReview(order.id).then(setExisting) }, [order.id])
  if (existing === undefined) return null
  if (existing) {
    return (
      <div className="card">
        <b>Your rating for {shop?.name}</b>
        <div><Stars value={existing.rating} size={20} /></div>
        {existing.comment && <p className="muted">“{existing.comment}”</p>}
      </div>
    )
  }
  async function send() {
    if (!rating) return alert('Please tap the stars to rate')
    setBusy(true)
    const r = await submitReview({ orderId: order.id, shopId: order.shopId, rating, comment })
    setBusy(false)
    if (r.error) return alert(r.error)
    setExisting({ rating, comment })
  }
  return (
    <div className="card">
      <b>How was your order from {shop?.name}?</b>
      <div style={{ margin: '6px 0' }}><Stars value={rating} onPick={setRating} /></div>
      <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell others about the shop (optional)" maxLength={300} />
      <button className="btn primary block" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Submit rating'}</button>
    </div>
  )
}

function ShopReviews({ shopId, count }) {
  const [list, setList] = useState(null)
  useEffect(() => { fetchShopReviews(shopId).then(setList) }, [shopId, count])
  if (!list || list.length === 0) return null
  return (
    <>
      <h3 className="section-title">Customer reviews</h3>
      {list.map((r) => (
        <div key={r.id} className="card review">
          <div className="row"><Stars value={r.rating} size={16} /><small className="muted">{timeAgo(Date.parse(r.created_at))}</small></div>
          {r.comment && <p>{r.comment}</p>}
        </div>
      ))}
    </>
  )
}

export function FxSettings() {
  const [p, setP] = useState(fxPrefs())
  const flip = (k) => { setFxPref(k, !p[k]); setP(fxPrefs()) }
  return (
    <div className="card fx-settings">
      <label className="switch-toggle"><input type="checkbox" checked={p.sound} onChange={() => flip('sound')} /><span className="slider" /> 🔊 Tap sounds</label>
      <label className="switch-toggle"><input type="checkbox" checked={p.motion} onChange={() => flip('motion')} /><span className="slider" /> ✨ Animations</label>
    </div>
  )
}

function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  async function save(e) {
    e.preventDefault()
    if (pw !== pw2) return setMsg('Passwords do not match')
    const r = await changeMyPassword(pw)
    if (r.error) return setMsg(r.error)
    setMsg('Password changed ✓'); setPw(''); setPw2('')
    setTimeout(() => { setOpen(false); setMsg('') }, 1500)
  }
  if (!open) return <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>🔑 Change password</button>
  return (
    <form className="card" style={{ marginTop: 14 }} onSubmit={save}>
      <b>Change password</b>
      <label>New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      <label>Repeat new password<input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
      {msg && <small className={msg.includes('✓') ? 'muted' : 'error-text'}>{msg}</small>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => { setOpen(false); setMsg('') }}>Cancel</button>
        <button className="btn primary">Save</button>
      </div>
    </form>
  )
}
export { ChangePassword }

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
      <FxSettings />
      <ChangePassword />
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

