import { useEffect, useMemo, useState } from 'react'
import { supabase, errMsg } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLive, q } from '../lib/useLive'
import { useCart, addToCart, qtyIn, cartCount, cartSubtotal, clearCart } from '../lib/cart'
import { useLocation, setLocation } from '../lib/location'
import { CATEGORIES, catOf, money, timeAgo, distanceKm, kmText, ACTIVE } from '../lib/constants'
import { StatusBadge, Tracker, BottomNav, Img, Stars, StarInput, Sheet, Loading, Empty } from '../components/ui'
import LocationPicker from '../components/LocationPicker'

// ------------------------------------------------------------------ root
export default function Customer() {
  const { profile } = useAuth()
  const loc = useLocation()
  const cart = useCart()
  const [stack, setStack] = useState([{ name: 'home' }])
  const view = stack[stack.length - 1]
  const [locOpen, setLocOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [wish, setWish] = useState(new Set())

  const nav = (v) => { setStack((s) => [...s, v]); window.history.pushState({ mb: 1 }, ''); window.scrollTo(0, 0) }
  const tab = (name) => { setStack([{ name }]); window.scrollTo(0, 0) }
  const back = () => window.history.back()
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // first time: use saved profile location, otherwise ask
  useEffect(() => {
    if (loc) return
    if (profile.lat) setLocation({ lat: profile.lat, lng: profile.lng, area: profile.area, label: profile.area || 'Saved location' })
    else setLocOpen(true)
  }, [loc, profile])

  const { data } = useLive(async () => {
    const [shops, products, settings] = await Promise.all([
      q(supabase.from('shops').select('*').eq('status', 'approved')),
      q(supabase.from('products').select('*').eq('status', 'approved').limit(5000)),
      q(supabase.from('settings').select('*').eq('id', 1).single()),
    ])
    return { shops, products, settings }
  }, [], ['shops', 'products'])

  useEffect(() => {
    supabase.from('wishlist').select('product_id').then(({ data: w }) => setWish(new Set((w || []).map((x) => x.product_id))))
  }, [])
  async function toggleWish(pid) {
    const has = wish.has(pid)
    const next = new Set(wish)
    if (has) next.delete(pid); else next.add(pid)
    setWish(next)
    const { error } = has
      ? await supabase.from('wishlist').delete().eq('product_id', pid).eq('customer_id', profile.id)
      : await supabase.from('wishlist').insert({ product_id: pid })
    if (error) { alert(errMsg(error)); setWish(wish) }
  }

  const ctx = useMemo(() => {
    if (!data) return null
    const radius = Number(data.settings.radius_km || 10)
    const all = data.shops.map((s) => ({ ...s, dist: distanceKm(loc, s) }))
      .sort((a, b) => (b.open - a.open) || ((a.dist ?? 999) - (b.dist ?? 999)))
    const near = !loc || showAll ? all : all.filter((s) => s.dist != null && s.dist <= radius)
    const shopMap = Object.fromEntries(all.map((s) => [s.id, s]))
    const nearIds = new Set(near.map((s) => s.id))
    return {
      settings: data.settings, radius, allShops: all, shops: near, shopMap,
      allProducts: data.products, products: data.products.filter((p) => nearIds.has(p.shop_id)),
      outside: all.length - near.length,
    }
  }, [data, loc, showAll])

  const common = { ctx, cart, nav, back, wish, toggleWish }
  let body
  if (!ctx) body = <Loading />
  else if (view.name === 'home') body = <Home {...common} loc={loc} openLoc={() => setLocOpen(true)} showAll={showAll} setShowAll={setShowAll} />
  else if (view.name === 'cat') body = <CategoryView {...common} id={view.id} />
  else if (view.name === 'sub') body = <SubView {...common} sub={view.sub} />
  else if (view.name === 'deals') body = <SubView {...common} deals />
  else if (view.name === 'shop') body = <ShopView {...common} id={view.id} />
  else if (view.name === 'search') body = <SearchView {...common} />
  else if (view.name === 'categories') body = <AllCategories {...common} />
  else if (view.name === 'cart') body = <CartView {...common} loc={loc} openLoc={() => setLocOpen(true)} />
  else if (view.name === 'orders') body = <OrdersView nav={nav} ctx={ctx} />
  else if (view.name === 'order') body = <OrderView id={view.id} ctx={ctx} back={back} />
  else if (view.name === 'wishlist') body = <WishlistView {...common} />
  else if (view.name === 'profile') body = <ProfileView loc={loc} openLoc={() => setLocOpen(true)} ctx={ctx} />

  const n = cartCount(cart)
  const rootTabs = ['home', 'categories', 'orders', 'wishlist', 'profile']
  return (
    <div className="app cust">
      <main className="page">{body}</main>
      {n > 0 && view.name !== 'cart' && (
        <button className="cart-bar" onClick={() => nav({ name: 'cart' })}>
          <span className="cart-thumbs">{cart.items.slice(0, 3).map((i) => <Img key={i.id} src={i.photo_url} emoji={i.emoji} className="xs" />)}</span>
          <span className="grow"><b>View cart</b><small>{n} item{n > 1 ? 's' : ''} · {money(cartSubtotal(cart))}</small></span>
          <b>›</b>
        </button>
      )}
      <BottomNav tab={rootTabs.includes(view.name) && stack.length === 1 ? view.name : ''} setTab={tab} items={[
        ['home', '🏠', 'Home'], ['categories', '🗂️', 'Categories'], ['orders', '📦', 'Orders'], ['wishlist', '❤️', 'Wishlist'], ['profile', '👤', 'Account'],
      ]} />
      {locOpen && <LocationSheet onClose={() => setLocOpen(false)} />}
    </div>
  )
}

// ------------------------------------------------------------------ location
function LocationSheet({ onClose }) {
  const { updateProfile } = useAuth()
  const loc = useLocation()
  const [v, setV] = useState(loc)
  async function save() {
    if (!v?.lat) return alert('Please choose your location on the map')
    setLocation(v)
    updateProfile({ lat: v.lat, lng: v.lng, area: v.area || '' }).catch(() => {})
    onClose()
  }
  return (
    <Sheet title="📍 Choose delivery location" onClose={() => loc && onClose()}>
      <p className="muted small">We show shops near this location.</p>
      <LocationPicker value={v} onChange={setV} />
      <button className="btn primary block lg" onClick={save}>Confirm location</button>
    </Sheet>
  )
}

// ------------------------------------------------------------------ home
function Home({ ctx, cart, nav, wish, toggleWish, loc, openLoc, showAll, setShowAll }) {
  const minEta = ctx.shops.filter((s) => s.open).reduce((m, s) => Math.min(m, s.eta || 30), 99)
  const groceryNear = ctx.shops.some((s) => s.category === 'grocery')
  const deals = ctx.products.filter((p) => p.in_stock && p.mrp > p.price)
    .sort((a, b) => (1 - b.price / b.mrp) - (1 - a.price / a.mrp)).slice(0, 12)
  const catsWithShops = new Set(ctx.shops.map((s) => s.category))

  return (
    <>
      <div className="hero">
        <div className="hero-top">
          <button className="loc-btn" onClick={openLoc}>
            <small>Delivery in</small>
            <b className="eta">{minEta === 99 ? '—' : `${minEta} minutes`}</b>
            <span className="loc-line">📍 {loc?.label || 'Set your location'} ▾</span>
          </button>
          <button className="avatar" onClick={() => nav({ name: 'profile' })}>👤</button>
        </div>
        <button className="search fake" onClick={() => nav({ name: 'search' })}>
          🔍 <span>Search "milk", "rice", "paracetamol", "cake"…</span>
        </button>
      </div>

      <div className="cats">
        {CATEGORIES.map((c) => (
          <button key={c.id} className={'cat' + (catsWithShops.has(c.id) ? '' : ' dim')} style={{ background: c.color }} onClick={() => nav({ name: 'cat', id: c.id })}>
            <span>{c.icon}</span><small>{c.short}</small>
          </button>
        ))}
      </div>

      <div className="banners">
        <div className="banner b1"><div><h3>Free delivery</h3><p>on orders above {money(ctx.settings.free_delivery_above)}</p></div><span>🛵</span></div>
        <button className="banner b2" onClick={() => nav({ name: 'cat', id: 'fruits' })}><div><h3>Farm fresh</h3><p>Fruits & veggies from Rythu bazar</p></div><span>🥭</span></button>
        <button className="banner b3" onClick={() => nav({ name: 'cat', id: 'medical' })}><div><h3>Medicines</h3><p>At your doorstep in minutes</p></div><span>💊</span></button>
      </div>

      {ctx.shops.length === 0 && (
        <Empty icon="📍" title="No shops near your location yet" sub={`We deliver within ${ctx.radius} km. ${ctx.outside} shop(s) are farther away.`}>
          <div className="row-btns">
            <button className="btn primary" onClick={openLoc}>Change location</button>
            {ctx.outside > 0 && <button className="btn ghost" onClick={() => setShowAll(true)}>Show all shops</button>}
          </div>
        </Empty>
      )}

      {groceryNear && (
        <>
          <h3 className="section-title">Grocery & Kitchen</h3>
          <div className="sub-grid">
            {catOf('grocery').subs.map((s) => {
              const sample = ctx.products.find((p) => p.subcategory === s)
              return (
                <button key={s} className="sub-tile" onClick={() => nav({ name: 'sub', sub: s })}>
                  <Img src={sample?.photo_url} emoji={sample?.emoji || '🛒'} className="md" />
                  <small>{s}</small>
                </button>
              )
            })}
          </div>
        </>
      )}

      {deals.length > 0 && (
        <>
          <div className="section-row">
            <h3 className="section-title">🔥 Best deals near you</h3>
            <button className="see-all" onClick={() => nav({ name: 'deals' })}>See all ›</button>
          </div>
          <div className="rail">
            {deals.map((p) => <ProductCard key={p.id} p={p} shop={ctx.shopMap[p.shop_id]} cart={cart} wish={wish} toggleWish={toggleWish} showShop />)}
          </div>
        </>
      )}

      {ctx.shops.length > 0 && (
        <>
          <div className="section-row">
            <h3 className="section-title">{showAll ? 'All shops' : 'Shops near you'} <small>· {ctx.shops.length}</small></h3>
            {showAll && <button className="see-all" onClick={() => setShowAll(false)}>Only nearby</button>}
          </div>
          <div className="shop-list">{ctx.shops.map((s) => <ShopCard key={s.id} s={s} nav={nav} />)}</div>
        </>
      )}
    </>
  )
}

function ShopCard({ s, nav }) {
  const c = catOf(s.category)
  return (
    <button className={'shop-card' + (s.open ? '' : ' closed')} onClick={() => nav({ name: 'shop', id: s.id })}>
      <div className="shop-img" style={{ background: c.color }}>
        {s.photo_url ? <img src={s.photo_url} alt="" /> : s.icon}
      </div>
      <div className="shop-info">
        <b>{s.name}</b>
        <small>{c.name}{s.area ? ' · ' + s.area : ''}</small>
        <div className="meta">
          <Stars value={s.rating_avg} count={s.rating_count} />
          <span>🕒 {s.eta} min</span>
          {s.dist != null && <span>📍 {kmText(s.dist)}</span>}
          {!s.open && <span className="closed-tag">Closed</span>}
        </div>
      </div>
    </button>
  )
}

function ProductCard({ p, shop, cart, wish, toggleWish, showShop }) {
  const n = qtyIn(cart, p.id)
  const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0
  const canBuy = p.in_stock && shop?.open
  return (
    <div className={'pcard' + (p.in_stock ? '' : ' oos')}>
      <div className="pcard-img">
        <Img src={p.photo_url} emoji={p.emoji} />
        {off > 0 && <span className="off-tag">{off}% OFF</span>}
        <button className={'heart' + (wish.has(p.id) ? ' on' : '')} onClick={() => toggleWish(p.id)}>{wish.has(p.id) ? '❤️' : '🤍'}</button>
        {!p.in_stock && <span className="oos-over">Out of stock</span>}
      </div>
      {showShop && shop && <small className="pshop">{shop.icon} {shop.name}{shop.dist != null ? ` · ${kmText(shop.dist)}` : ''}</small>}
      <b className="pname">{p.name}</b>
      <small className="muted">{p.unit}</small>
      <div className="pcard-foot">
        <div className="pprice"><b>{money(p.price)}</b>{off > 0 && <s>{money(p.mrp)}</s>}</div>
        {!canBuy ? null : n === 0
          ? <button className="btn add" onClick={() => addToCart(p, 1, shop.name)}>ADD</button>
          : <div className="qty"><button onClick={() => addToCart(p, -1, shop.name)}>−</button><b>{n}</b><button onClick={() => addToCart(p, 1, shop.name)}>+</button></div>}
      </div>
      {shop && !shop.open && p.in_stock && <small className="closed-tag">Shop closed</small>}
    </div>
  )
}

function Grid({ list, ctx, ...rest }) {
  if (list.length === 0) return <Empty icon="🔎" title="No products here yet" />
  return <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} shop={ctx.shopMap[p.shop_id]} {...rest} />)}</div>
}

function Back({ back, title, children }) {
  return <div className="view-head"><button className="back" onClick={back}>←</button><h2>{title}</h2>{children}</div>
}

// ------------------------------------------------------------------ category / sub / search
function AllCategories({ ctx, nav }) {
  return (
    <>
      <h2 className="page-title">All Categories</h2>
      {CATEGORIES.map((c) => (
        <div key={c.id} className="cat-block">
          <button className="cat-block-head" onClick={() => nav({ name: 'cat', id: c.id })}>
            <span style={{ background: c.color }}>{c.icon}</span><b>{c.name}</b>
            <small>{ctx.shops.filter((s) => s.category === c.id).length} shops ›</small>
          </button>
          <div className="chip-row">
            {c.subs.map((s) => <button key={s} className="chip" onClick={() => nav({ name: 'sub', sub: s })}>{s}</button>)}
          </div>
        </div>
      ))}
    </>
  )
}

function CategoryView({ ctx, nav, back, id, ...rest }) {
  const c = catOf(id)
  const [sub, setSub] = useState('All')
  const shops = ctx.shops.filter((s) => s.category === id)
  const ids = new Set(shops.map((s) => s.id))
  const products = ctx.products.filter((p) => ids.has(p.shop_id) && (sub === 'All' || p.subcategory === sub))
  return (
    <>
      <Back back={back} title={`${c.icon} ${c.name}`} />
      {shops.length === 0 ? <Empty icon={c.icon} title={`No ${c.short} shops near you yet`} sub="Ask your local shop to join Mana Bazar!" /> : (
        <>
          <div className="rail shops-rail">{shops.map((s) => <ShopCard key={s.id} s={s} nav={nav} />)}</div>
          <div className="chip-row sticky-chips">
            {['All', ...c.subs].map((s) => <button key={s} className={'chip' + (sub === s ? ' active' : '')} onClick={() => setSub(s)}>{s}</button>)}
          </div>
          <Grid list={products} ctx={ctx} showShop {...rest} />
        </>
      )}
    </>
  )
}

function SubView({ ctx, back, sub, deals, ...rest }) {
  const list = deals
    ? ctx.products.filter((p) => p.mrp > p.price).sort((a, b) => (1 - b.price / b.mrp) - (1 - a.price / a.mrp))
    : ctx.products.filter((p) => p.subcategory === sub)
  return (
    <>
      <Back back={back} title={deals ? '🔥 Best deals' : sub} />
      <Grid list={list} ctx={ctx} showShop {...rest} />
    </>
  )
}

function SearchView({ ctx, back, nav, ...rest }) {
  const [text, setText] = useState('')
  const t = text.trim().toLowerCase()
  const shops = t ? ctx.shops.filter((s) => s.name.toLowerCase().includes(t) || catOf(s.category).name.toLowerCase().includes(t)) : []
  const products = t ? ctx.products.filter((p) => (p.name + ' ' + p.subcategory).toLowerCase().includes(t)) : []
  const popular = ['Milk', 'Rice', 'Oil', 'Bread', 'Eggs', 'Paracetamol', 'Cake', 'Notebook', 'Bulb', 'Chicken']
  return (
    <>
      <div className="view-head">
        <button className="back" onClick={back}>←</button>
        <div className="search grow"><span>🔍</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Search products or shops" />
          {text && <button onClick={() => setText('')}>✕</button>}</div>
      </div>
      {!t && (
        <>
          <h3 className="section-title">Popular searches</h3>
          <div className="chip-row wrap">{popular.map((p) => <button key={p} className="chip" onClick={() => setText(p)}>🔍 {p}</button>)}</div>
        </>
      )}
      {t && shops.length > 0 && <><h3 className="section-title">Shops</h3><div className="shop-list">{shops.map((s) => <ShopCard key={s.id} s={s} nav={nav} />)}</div></>}
      {t && <h3 className="section-title">Products <small>· {products.length}</small></h3>}
      {t && <Grid list={products} ctx={ctx} showShop {...rest} />}
    </>
  )
}

// ------------------------------------------------------------------ shop page (Zepto style sidebar)
function ShopView({ ctx, back, id, ...rest }) {
  const shop = ctx.allShops.find((s) => s.id === id)
  const [sub, setSub] = useState('All')
  const [reviews, setReviews] = useState(null)
  const [text, setText] = useState('')
  if (!shop) return <><Back back={back} title="Shop" /><Empty title="Shop not available" /></>
  const products = ctx.allProducts.filter((p) => p.shop_id === id)
  const subs = ['All', ...Array.from(new Set(products.map((p) => p.subcategory || 'Other')))]
  const list = products.filter((p) => (sub === 'All' || p.subcategory === sub) && p.name.toLowerCase().includes(text.toLowerCase()))
  const c = catOf(shop.category)

  async function openReviews() {
    const { data } = await supabase.from('reviews').select('*').eq('shop_id', id).order('created_at', { ascending: false }).limit(50)
    setReviews(data || [])
  }

  return (
    <>
      <button className="back float" onClick={back}>←</button>
      <div className="shop-cover" style={{ background: c.color }}>
        {shop.photo_url ? <img src={shop.photo_url} alt="" /> : <span>{shop.icon}</span>}
      </div>
      <div className="card shop-head">
        <h2>{shop.name}</h2>
        <p className="muted small">{c.name} · {shop.address || shop.area}</p>
        {shop.description && <p className="small">{shop.description}</p>}
        <div className="meta">
          <button className="plain" onClick={openReviews}><Stars value={shop.rating_avg} count={shop.rating_count} /> <u>Reviews</u></button>
          <span>🕒 {shop.eta}-{shop.eta + 10} min</span>
          {shop.dist != null && <span>📍 {kmText(shop.dist)}</span>}
          <span>⏰ {shop.open_time}–{shop.close_time}</span>
          {shop.phone && <a href={`tel:${shop.phone}`}>📞 Call</a>}
        </div>
        {!shop.open && <div className="warn">Shop is closed right now. You can browse but can't order.</div>}
        {shop.dist != null && shop.dist > ctx.radius && <div className="warn">This shop is {kmText(shop.dist)} away – outside the {ctx.radius} km delivery area.</div>}
      </div>
      <div className="search"><span>🔍</span><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Search in ${shop.name}`} /></div>
      <div className="shop-body">
        <aside className="side-subs">
          {subs.map((s) => {
            const sample = s === 'All' ? null : products.find((p) => p.subcategory === s)
            return (
              <button key={s} className={sub === s ? 'active' : ''} onClick={() => setSub(s)}>
                <Img src={sample?.photo_url} emoji={s === 'All' ? '🛍️' : sample?.emoji} className="sm" /><small>{s}</small>
              </button>
            )
          })}
        </aside>
        <div className="shop-products">
          {list.length === 0 ? <Empty icon="📦" title="No products" /> :
            <div className="pgrid two">{list.map((p) => <ProductCard key={p.id} p={p} shop={shop} {...rest} />)}</div>}
        </div>
      </div>
      {reviews && (
        <Sheet title={`⭐ Reviews · ${shop.name}`} onClose={() => setReviews(null)}>
          {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="review">
              <div className="row"><b>{r.customer_name || 'Customer'}</b><span className="rating">★ {r.rating}</span></div>
              {r.comment && <p>{r.comment}</p>}
              <small className="muted">{timeAgo(r.created_at)}</small>
            </div>
          ))}
        </Sheet>
      )}
    </>
  )
}

// ------------------------------------------------------------------ cart & checkout
function CartView({ ctx, cart, nav, back, loc, openLoc }) {
  const { profile, updateProfile } = useAuth()
  const [house, setHouse] = useState(profile.address || '')
  const [payment, setPayment] = useState('COD')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  if (!cart) return <><Back back={back} title="Cart" /><Empty icon="🛒" title="Your cart is empty" sub="Add items from any shop near you" /></>

  const shop = ctx.allShops.find((s) => s.id === cart.shopId)
  const sub = cartSubtotal(cart)
  const free = sub >= Number(ctx.settings.free_delivery_above)
  const fee = free ? 0 : Number(ctx.settings.delivery_fee)
  const saved = cart.items.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0)

  async function place() {
    if (!shop) return alert('This shop is not available now')
    if (!loc?.lat) return openLoc()
    if (!house.trim()) return alert('Please enter house / flat number and street')
    setBusy(true)
    try {
      const { data: id, error } = await supabase.rpc('place_order', {
        p_shop: shop.id, p_items: cart.items.map((i) => ({ id: i.id, qty: i.qty })),
        p_address: `${house.trim()}, ${loc.label}`, p_lat: loc.lat, p_lng: loc.lng, p_payment: payment, p_note: note,
      })
      if (error) throw error
      if (house !== profile.address) updateProfile({ address: house.trim() }).catch(() => {})
      clearCart()
      nav({ name: 'order', id })
    } catch (e) { alert(errMsg(e)) }
    setBusy(false)
  }

  return (
    <>
      <Back back={back} title="Checkout" />
      {saved > 0 && <div className="savings">🎉 You are saving {money(saved)} on this order</div>}
      <div className="card">
        <button className="link" onClick={() => nav({ name: 'shop', id: cart.shopId })}>{shop?.icon} <b>{cart.shopName}</b> · add more ›</button>
        {cart.items.map((it) => (
          <div key={it.id} className="cart-row">
            <Img src={it.photo_url} emoji={it.emoji} className="sm" />
            <span className="grow">{it.name}<small>{it.unit}</small></span>
            <div className="qty sm">
              <button onClick={() => addToCart({ ...it, shop_id: cart.shopId }, -1, cart.shopName)}>−</button><b>{it.qty}</b>
              <button onClick={() => addToCart({ ...it, shop_id: cart.shopId }, 1, cart.shopName)}>+</button>
            </div>
            <b className="amt">{money(it.price * it.qty)}</b>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row"><b>📍 Delivering to</b><button className="see-all" onClick={openLoc}>Change</button></div>
        <p className="muted small">{loc?.label || 'No location set'}</p>
        <label>House / Flat no, Street, Landmark<textarea rows={2} value={house} onChange={(e) => setHouse(e.target.value)} placeholder="e.g. 4-12, 2nd lane, near temple" /></label>
        <label>Note for shop (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. call before delivery" /></label>
      </div>

      <div className="card">
        <b>💳 Payment</b>
        <div className="pay">
          <label className={'radio' + (payment === 'COD' ? ' active' : '')}><input type="radio" checked={payment === 'COD'} onChange={() => setPayment('COD')} />💵 Cash on Delivery</label>
          <label className={'radio' + (payment === 'UPI' ? ' active' : '')}><input type="radio" checked={payment === 'UPI'} onChange={() => setPayment('UPI')} />
            📱 {shop?.upi_id ? 'Pay by UPI (GPay / PhonePe)' : 'UPI on delivery'}</label>
        </div>
      </div>

      <div className="card bill">
        <b>Bill details</b>
        <div><span>Item total</span><span>{money(sub)}</span></div>
        <div><span>Delivery fee</span><span>{fee ? money(fee) : <i className="free">FREE</i>}</span></div>
        {!free && <small>Add {money(ctx.settings.free_delivery_above - sub)} more for FREE delivery</small>}
        <div className="total"><span>To Pay</span><span>{money(sub + fee)}</span></div>
      </div>
      <button className="btn primary block lg sticky-cta" onClick={place} disabled={busy || !shop?.open}>
        {!shop?.open ? 'Shop is closed' : busy ? 'Placing order…' : `Place Order · ${money(sub + fee)}`}
      </button>
    </>
  )
}

// ------------------------------------------------------------------ orders
function OrdersView({ nav, ctx }) {
  const { profile } = useAuth()
  const { data: orders } = useLive(() => q(supabase.from('orders').select('*').eq('customer_id', profile.id).order('created_at', { ascending: false }).limit(100)), [profile.id], ['orders'])
  if (!orders) return <Loading />
  if (!orders.length) return <Empty icon="📦" title="No orders yet" sub="Your orders will show here" />
  return (
    <>
      <h2 className="page-title">My Orders</h2>
      {orders.map((o) => {
        const s = ctx.shopMap[o.shop_id]
        return (
          <button key={o.id} className={'card order-card' + (ACTIVE.includes(o.status) ? ' live' : '')} onClick={() => nav({ name: 'order', id: o.id })}>
            <div className="row"><b>{s?.icon} {s?.name || 'Shop'}</b><StatusBadge s={o.status} /></div>
            <small className="muted">{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</small>
            <div className="row"><small className="muted">#{o.id} · {timeAgo(o.created_at)}</small><b>{money(o.total)}</b></div>
            {o.status === 'delivered' && !o.rated && <small className="rate-hint">⭐ Rate this order</small>}
          </button>
        )
      })}
    </>
  )
}

function OrderView({ id, ctx, back }) {
  const { data } = useLive(async () => {
    const [o, otp] = await Promise.all([
      q(supabase.from('orders').select('*').eq('id', id).single()),
      supabase.from('order_otps').select('otp').eq('order_id', id).maybeSingle(),
    ])
    return { o, otp: otp.data?.otp }
  }, [id], ['orders'])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  if (!data) return <Loading />
  const { o, otp } = data
  const shop = ctx.allShops.find((s) => s.id === o.shop_id)
  const upi = shop?.upi_id && o.payment === 'UPI' && !['cancelled', 'rejected', 'delivered'].includes(o.status)
    ? `upi://pay?pa=${encodeURIComponent(shop.upi_id)}&pn=${encodeURIComponent(shop.name)}&am=${o.total}&cu=INR&tn=${encodeURIComponent('Mana Bazar order ' + o.id)}`
    : null

  async function cancel() {
    if (!confirm('Cancel this order?')) return
    const { error } = await supabase.rpc('update_order_status', { p_id: o.id, p_status: 'cancelled' })
    if (error) alert(errMsg(error))
  }
  async function rate() {
    const { error } = await supabase.rpc('rate_order', { p_id: o.id, p_rating: rating, p_comment: comment })
    if (error) alert(errMsg(error))
  }

  return (
    <>
      <Back back={back} title={`Order #${o.id}`}><StatusBadge s={o.status} /></Back>
      {ACTIVE.includes(o.status) && otp && (
        <div className="otp-box"><small>Delivery OTP – tell this only when you receive your order</small><b>{otp}</b></div>
      )}
      <div className="card">
        <p className="muted">{shop?.icon} {shop?.name} {shop?.phone && <a href={`tel:${shop.phone}`}>· 📞 Call shop</a>}</p>
        {o.status === 'delivered' && <div className="success">🎉 Delivered! Thank you for shopping with Mana Bazar.</div>}
        <Tracker o={o} />
        {o.delivery_name && ACTIVE.includes(o.status) && (
          <div className="delivery-person">🛵 <b>{o.delivery_name}</b> is delivering your order {o.delivery_phone && <a href={`tel:${o.delivery_phone}`}>📞 Call</a>}</div>
        )}
      </div>
      {upi && <a className="btn upi block lg" href={upi}>📱 Pay {money(o.total)} by UPI app</a>}
      {o.status === 'delivered' && !o.rated && (
        <div className="card">
          <b>How was your order?</b>
          <StarInput value={rating} onChange={setRating} />
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a review (optional)" />
          <button className="btn primary block mt" onClick={rate}>Submit rating</button>
        </div>
      )}
      <div className="card">
        {o.items.map((i) => (
          <div key={i.id} className="cart-row"><Img src={i.photo_url} emoji={i.emoji} className="sm" /><span className="grow">{i.name} × {i.qty}<small>{i.unit}</small></span><b>{money(i.price * i.qty)}</b></div>
        ))}
        <div className="bill">
          <div><span>Item total</span><span>{money(o.item_total)}</span></div>
          <div><span>Delivery</span><span>{Number(o.delivery_fee) ? money(o.delivery_fee) : 'FREE'}</span></div>
          <div className="total"><span>Total · {o.payment}</span><span>{money(o.total)}</span></div>
        </div>
        <p className="muted small">📍 {o.address}</p>
        {o.note && <p className="muted small">📝 {o.note}</p>}
      </div>
      {o.status === 'placed' && <button className="btn danger block" onClick={cancel}>Cancel Order</button>}
    </>
  )
}

// ------------------------------------------------------------------ wishlist & profile
function WishlistView({ ctx, wish, ...rest }) {
  const list = ctx.allProducts.filter((p) => wish.has(p.id))
  return (
    <>
      <h2 className="page-title">❤️ Wishlist</h2>
      {list.length === 0 ? <Empty icon="🤍" title="No favourites yet" sub="Tap 🤍 on any product to save it here" />
        : <Grid list={list} ctx={ctx} wish={wish} showShop {...rest} />}
    </>
  )
}

function ProfileView({ loc, openLoc, ctx }) {
  const { profile, updateProfile, signOut } = useAuth()
  const [f, setF] = useState({ name: profile.name, address: profile.address || '' })
  const [msg, setMsg] = useState('')
  async function save() {
    try { await updateProfile(f); setMsg('Saved ✓') } catch (e) { setMsg(errMsg(e)) }
    setTimeout(() => setMsg(''), 2000)
  }
  return (
    <>
      <h2 className="page-title">👤 My Account</h2>
      <div className="card">
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Mobile<input value={profile.phone} disabled /></label>
        <label>House / Flat, Street<textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        <button className="btn primary" onClick={save}>{msg || 'Save'}</button>
      </div>
      <div className="card">
        <div className="row"><b>📍 Delivery location</b><button className="see-all" onClick={openLoc}>Change</button></div>
        <p className="muted small">{loc?.label || 'Not set'}</p>
      </div>
      {ctx.settings.support_phone && <a className="card link-card" href={`tel:${ctx.settings.support_phone}`}>📞 Mana Bazar support: {ctx.settings.support_phone}</a>}
      <button className="btn ghost block" onClick={() => confirm('Logout?') && signOut()}>Logout</button>
    </>
  )
}
