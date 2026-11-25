import { useEffect, useState } from 'react'
import { supabase, errMsg } from '../lib/supabase'
import { useLive, q } from '../lib/useLive'
import { CATEGORIES, catOf, money, timeAgo, STATUS_LABEL, ACTIVE, mapsLink } from '../lib/constants'
import { StatusBadge, Stat, Img, Stars, Sheet, Loading, Empty } from '../components/ui'
import { TopBar } from '../components/TopBar'
import { ShopForm, ProductForm } from '../components/forms'

export default function Admin() {
  const [tab, setTab] = useState('dashboard')
  const [productShop, setProductShop] = useState('')
  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const { data, reload } = useLive(async () => {
    const [shops, products, orders, users, settings] = await Promise.all([
      q(supabase.from('shops').select('*').order('created_at', { ascending: false })),
      q(supabase.from('products').select('*').order('created_at', { ascending: false }).limit(5000)),
      q(supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1000)),
      q(supabase.from('profiles').select('*').order('created_at', { ascending: false })),
      q(supabase.from('settings').select('*').eq('id', 1).single()),
    ])
    return { shops, products, orders, users, settings, shopMap: Object.fromEntries(shops.map((s) => [s.id, s])), userMap: Object.fromEntries(users.map((u) => [u.id, u])) }
  }, [], ['shops', 'products', 'orders'])

  if (!data) return <div className="app"><TopBar subtitle="Admin Panel" /><Loading /></div>

  const pending = data.shops.filter((s) => s.status === 'pending').length
    + data.products.filter((p) => p.status === 'pending').length
    + data.users.filter((u) => u.role === 'delivery' && u.status === 'pending').length

  const TABS = [
    ['dashboard', '📊 Dashboard'], ['approvals', `✅ Approvals${pending ? ` (${pending})` : ''}`], ['shops', '🏪 Shops'],
    ['products', '📦 Products'], ['orders', '🧾 Orders'], ['users', '👥 Users'], ['settings', '⚙️ Settings'],
  ]
  const props = { data, reload, go: setTab, setProductShop }

  return (
    <div className="app">
      <TopBar subtitle="Admin Panel" />
      <nav className="admin-tabs">
        {TABS.map(([id, l]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{l}</button>)}
      </nav>
      <main className="page wide admin">
        {tab === 'dashboard' && <Dashboard {...props} />}
        {tab === 'approvals' && <Approvals {...props} />}
        {tab === 'shops' && <Shops {...props} />}
        {tab === 'products' && <Products {...props} shopId={productShop} setShopId={setProductShop} />}
        {tab === 'orders' && <Orders {...props} />}
        {tab === 'users' && <Users {...props} />}
        {tab === 'settings' && <Settings {...props} />}
      </main>
    </div>
  )
}

async function run(promise, reload) {
  const { error } = await promise
  if (error) alert(errMsg(error)); else reload()
}

// ------------------------------------------------------------------ dashboard
function Dashboard({ data, go }) {
  const delivered = data.orders.filter((o) => o.status === 'delivered')
  const gmv = delivered.reduce((s, o) => s + Number(o.total), 0)
  const commission = Math.round(delivered.reduce((s, o) => s + Number(o.item_total), 0) * Number(data.settings.commission) / 100)
  const today = new Date().toDateString()
  const todayOrders = data.orders.filter((o) => new Date(o.created_at).toDateString() === today)
  const riders = data.users.filter((u) => u.role === 'delivery' && u.status === 'active')
  const pendingShops = data.shops.filter((s) => s.status === 'pending').length
  const pendingProducts = data.products.filter((p) => p.status === 'pending').length
  const pendingRiders = data.users.filter((u) => u.role === 'delivery' && u.status === 'pending').length

  return (
    <>
      <h2 className="page-title">Dashboard</h2>
      {(pendingShops + pendingProducts + pendingRiders) > 0 && (
        <button className="card warn-card" onClick={() => go('approvals')}>
          ⏳ Waiting for approval: <b>{pendingShops}</b> shops · <b>{pendingProducts}</b> products · <b>{pendingRiders}</b> delivery partners → Review
        </button>
      )}
      <div className="stats">
        <Stat icon="📅" label="Today's orders" value={todayOrders.length} tone="orange" />
        <Stat icon="⏳" label="Live orders" value={data.orders.filter((o) => ACTIVE.includes(o.status)).length} tone="orange" />
        <Stat icon="💰" label="Total sales (GMV)" value={money(gmv)} tone="green" />
        <Stat icon="🏦" label={`Commission (${data.settings.commission}%)`} value={money(commission)} tone="green" />
        <Stat icon="🏪" label="Active shops" value={data.shops.filter((s) => s.status === 'approved').length} />
        <Stat icon="📦" label="Products" value={data.products.filter((p) => p.status === 'approved').length} />
        <Stat icon="🧑" label="Customers" value={data.users.filter((u) => u.role === 'customer').length} />
        <Stat icon="🛵" label="Delivery partners (online)" value={`${riders.length} (${riders.filter((r) => r.online).length})`} />
      </div>
      <div className="two-col">
        <div>
          <h3 className="section-title">Shops by category</h3>
          <div className="card">
            {CATEGORIES.map((c) => {
              const ids = new Set(data.shops.filter((s) => s.category === c.id && s.status === 'approved').map((s) => s.id))
              return <div key={c.id} className="row"><span>{c.icon} {c.name}</span><small className="muted">{ids.size} shops · {data.orders.filter((o) => ids.has(o.shop_id)).length} orders</small></div>
            })}
          </div>
        </div>
        <div>
          <h3 className="section-title">Recent orders</h3>
          <div className="card">
            {data.orders.slice(0, 8).map((o) => (
              <div key={o.id} className="row"><span>#{o.id} · {data.shopMap[o.shop_id]?.name}<br /><small className="muted">{o.customer_name} · {timeAgo(o.created_at)}</small></span>
                <span className="right"><b>{money(o.total)}</b><br /><StatusBadge s={o.status} /></span></div>
            ))}
            {data.orders.length === 0 && <small className="muted">No orders yet</small>}
          </div>
        </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ approvals
function Approvals({ data, reload }) {
  const shops = data.shops.filter((s) => s.status === 'pending')
  const products = data.products.filter((p) => p.status === 'pending')
  const riders = data.users.filter((u) => u.role === 'delivery' && u.status === 'pending')
  const [view, setView] = useState(null)

  async function approveAllProducts() {
    if (!confirm(`Approve all ${products.length} pending products?`)) return
    run(supabase.from('products').update({ status: 'approved' }).in('id', products.map((p) => p.id)), reload)
  }

  return (
    <>
      <h2 className="page-title">Approvals</h2>
      <h3 className="section-title">🏪 New shops <small>· {shops.length}</small></h3>
      {shops.length === 0 && <p className="muted small">No shops waiting.</p>}
      <div className="cards-grid">
        {shops.map((s) => {
          const owner = data.userMap[s.owner_id]
          const missing = [!s.photo_url && 'photo', !s.lat && 'location', !s.address && 'address'].filter(Boolean)
          return (
            <div key={s.id} className="card">
              <div className="row-left"><Img src={s.photo_url} emoji={s.icon} className="md round" /><div><b>{s.name}</b><br /><small className="muted">{catOf(s.category).name}</small></div></div>
              <small className="block">👤 {owner?.name} · 📞 {owner?.phone || s.phone}</small>
              <small className="block muted">📍 {s.address || '—'} {s.lat && <a href={mapsLink(s.lat, s.lng)} target="_blank" rel="noreferrer">Map</a>}</small>
              <small className="block muted">💳 UPI: {s.upi_id || '—'} · {data.products.filter((p) => p.shop_id === s.id).length} products</small>
              {missing.length > 0 && <small className="block warn-text">Missing: {missing.join(', ')}</small>}
              <div className="actions">
                <button className="btn ghost sm" onClick={() => setView(s)}>View / Edit</button>
                <button className="btn danger sm" onClick={() => run(supabase.from('shops').update({ status: 'blocked' }).eq('id', s.id), reload)}>Reject</button>
                <button className="btn primary sm" onClick={() => run(supabase.from('shops').update({ status: 'approved' }).eq('id', s.id), reload)}>Approve</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-row">
        <h3 className="section-title">📦 New products <small>· {products.length}</small></h3>
        {products.length > 1 && <button className="btn primary sm" onClick={approveAllProducts}>Approve all</button>}
      </div>
      {products.length === 0 && <p className="muted small">No products waiting.</p>}
      <div className="plist">
        {products.map((p) => (
          <div key={p.id} className="product">
            <Img src={p.photo_url} emoji={p.emoji} className="md" />
            <div className="p-info"><b>{p.name}</b><small>{data.shopMap[p.shop_id]?.name} · {p.subcategory} · {p.unit}</small>
              <div><span className="price">{money(p.price)}</span>{p.mrp > p.price && <s>{money(p.mrp)}</s>}</div></div>
            <div className="p-actions">
              <button className="btn primary sm" onClick={() => run(supabase.from('products').update({ status: 'approved' }).eq('id', p.id), reload)}>Approve</button>
              <button className="btn danger sm" onClick={() => run(supabase.from('products').update({ status: 'rejected' }).eq('id', p.id), reload)}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="section-title">🛵 New delivery partners <small>· {riders.length}</small></h3>
      {riders.length === 0 && <p className="muted small">No delivery partners waiting.</p>}
      {riders.map((u) => (
        <div key={u.id} className="card row">
          <span><b>{u.name}</b> · 📞 {u.phone}<br /><small className="muted">{u.vehicle} · {u.area} · joined {timeAgo(u.created_at)}</small></span>
          <span className="nowrap">
            <button className="btn danger sm" onClick={() => run(supabase.from('profiles').update({ status: 'blocked' }).eq('id', u.id), reload)}>Reject</button>
            <button className="btn primary sm" onClick={() => run(supabase.from('profiles').update({ status: 'active' }).eq('id', u.id), reload)}>Approve</button>
          </span>
        </div>
      ))}

      {view && <Sheet title={view.name} onClose={() => setView(null)}><ShopForm shop={view} isAdmin onSaved={() => { setView(null); reload() }} onCancel={() => setView(null)} /></Sheet>}
    </>
  )
}

// ------------------------------------------------------------------ shops
function Shops({ data, reload, go, setProductShop }) {
  const [filter, setFilter] = useState('all')
  const [text, setText] = useState('')
  const [edit, setEdit] = useState(null)
  if (edit) return <ShopForm shop={edit.id ? edit : null} isAdmin onSaved={() => { setEdit(null); reload() }} onCancel={() => setEdit(null)} />

  const list = data.shops.filter((s) => (filter === 'all' || s.status === filter) && (s.name + s.area + s.category).toLowerCase().includes(text.toLowerCase()))
  async function del(s) {
    if (!confirm(`Delete ${s.name} and all its products? This cannot be undone.`)) return
    run(supabase.from('shops').delete().eq('id', s.id), reload)
  }
  return (
    <>
      <div className="section-row"><h2 className="page-title">Shops</h2><button className="btn primary" onClick={() => setEdit({})}>+ Add shop</button></div>
      <div className="chips">
        {['all', 'pending', 'approved', 'blocked'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)} ({f === 'all' ? data.shops.length : data.shops.filter((s) => s.status === f).length})
          </button>
        ))}
      </div>
      <div className="search"><span>🔍</span><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search shops" /></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Shop</th><th>Owner</th><th>Rating</th><th>Products / Orders</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((s) => {
              const owner = data.userMap[s.owner_id]
              return (
                <tr key={s.id}>
                  <td><div className="row-left"><Img src={s.photo_url} emoji={s.icon} className="sm round" /><div><b>{s.name}</b><br /><small className="muted">{catOf(s.category).short} · {s.area || '—'}{!s.lat && ' · ⚠️ no location'}</small></div></div></td>
                  <td>{owner ? <>{owner.name}<br /><small className="muted">{owner.phone}</small></> : <small className="muted">Not linked</small>}</td>
                  <td><Stars value={s.rating_avg} count={s.rating_count} /></td>
                  <td>{data.products.filter((p) => p.shop_id === s.id).length} / {data.orders.filter((o) => o.shop_id === s.id).length}</td>
                  <td><span className={'badge sh-' + s.status}>{s.status}</span>{s.status === 'approved' && !s.open && <small className="muted"> closed</small>}</td>
                  <td className="nowrap">
                    <button className="btn ghost sm" onClick={() => setEdit(s)}>✏️ Edit</button>
                    <button className="btn ghost sm" onClick={() => { setProductShop(s.id); go('products') }}>📦</button>
                    {s.status !== 'approved' && <button className="btn primary sm" onClick={() => run(supabase.from('shops').update({ status: 'approved' }).eq('id', s.id), reload)}>Approve</button>}
                    {s.status !== 'blocked' && <button className="btn danger sm" onClick={() => run(supabase.from('shops').update({ status: 'blocked' }).eq('id', s.id), reload)}>Block</button>}
                    <button className="btn ghost sm" onClick={() => del(s)}>🗑️</button>
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && <tr><td colSpan={6} className="muted">No shops</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ products
function Products({ data, reload, shopId, setShopId }) {
  const [status, setStatus] = useState('all')
  const [text, setText] = useState('')
  const [edit, setEdit] = useState(null)
  const shop = data.shopMap[shopId]
  if (edit && shop) return <ProductForm shop={shop} product={edit.id ? edit : null} isAdmin onDone={() => { setEdit(null); reload() }} />

  const list = data.products.filter((p) => (!shopId || p.shop_id === shopId) && (status === 'all' || p.status === status) && p.name.toLowerCase().includes(text.toLowerCase())).slice(0, 300)
  return (
    <>
      <div className="section-row">
        <h2 className="page-title">Products</h2>
        <button className="btn primary" onClick={() => (shop ? setEdit({}) : alert('First choose a shop from the list'))}>+ Add product</button>
      </div>
      <div className="filters">
        <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="">All shops</option>
          {data.shops.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="🔍 Search product" />
      </div>
      {list.length === 0 && <Empty icon="📦" title="No products" />}
      <div className="plist">
        {list.map((p) => (
          <div key={p.id} className={'product' + (p.in_stock ? '' : ' oos')}>
            <Img src={p.photo_url} emoji={p.emoji} className="md" />
            <div className="p-info"><b>{p.name}</b><small>{data.shopMap[p.shop_id]?.name} · {p.subcategory} · {p.unit}</small>
              <div><span className="price">{money(p.price)}</span>{p.mrp > p.price && <s>{money(p.mrp)}</s>} <span className={'badge sh-' + (p.status === 'approved' ? 'approved' : p.status === 'pending' ? 'pending' : 'blocked')}>{p.status}</span></div></div>
            <div className="p-actions">
              <div>
                {p.status !== 'approved' && <button className="btn primary sm" onClick={() => run(supabase.from('products').update({ status: 'approved' }).eq('id', p.id), reload)}>Approve</button>}
                {p.status === 'approved' && <button className="btn danger sm" onClick={() => run(supabase.from('products').update({ status: 'rejected' }).eq('id', p.id), reload)}>Hide</button>}
              </div>
              <div>
                <button className="icon-btn" onClick={() => { setShopId(p.shop_id); setEdit(p) }}>✏️</button>
                <button className="icon-btn" onClick={() => confirm(`Delete ${p.name}?`) && run(supabase.from('products').delete().eq('id', p.id), reload)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ------------------------------------------------------------------ orders
function Orders({ data }) {
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(null)
  const list = data.orders.filter((o) => status === 'all' || (status === 'live' ? ACTIVE.includes(o.status) : o.status === status))
  async function setTo(o, s) {
    if (!confirm(`Change order #${o.id} to "${STATUS_LABEL[s]}"?`)) return
    const { error } = await supabase.rpc('update_order_status', { p_id: o.id, p_status: s })
    if (error) alert(errMsg(error))
  }
  return (
    <>
      <h2 className="page-title">Orders</h2>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All orders</option><option value="live">Live orders</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Shop</th><th>Customer</th><th>Delivery</th><th>Amount</th><th>Status</th><th>Change</th></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td><button className="plain link-text" onClick={() => setOpen(o)}><b>#{o.id}</b></button><br /><small className="muted">{timeAgo(o.created_at)}</small></td>
                <td>{data.shopMap[o.shop_id]?.name || '—'}</td>
                <td>{o.customer_name}<br /><small className="muted">{o.customer_phone}</small></td>
                <td>{o.delivery_name || <small className="muted">—</small>}</td>
                <td>{money(o.total)}<br /><small className="muted">{o.payment}</small></td>
                <td><StatusBadge s={o.status} /></td>
                <td>
                  <select className="mini" value="" onChange={(e) => e.target.value && setTo(o, e.target.value)}>
                    <option value="">Set…</option>
                    {Object.entries(STATUS_LABEL).filter(([k]) => k !== o.status).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="muted">No orders</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <Sheet title={`Order #${open.id}`} onClose={() => setOpen(null)}>
          <p><StatusBadge s={open.status} /> · {open.payment} · {timeAgo(open.created_at)}</p>
          {open.items.map((i) => <div key={i.id} className="cart-row"><Img src={i.photo_url} emoji={i.emoji} className="xs" /><span className="grow">{i.name} × {i.qty}</span><b>{money(i.price * i.qty)}</b></div>)}
          <div className="bill"><div className="total"><span>Total</span><span>{money(open.total)}</span></div></div>
          <p className="small">👤 {open.customer_name} · {open.customer_phone}<br />📍 {open.address}</p>
          {open.note && <p className="small">📝 {open.note}</p>}
          <p className="small muted">{(open.history || []).map((h) => `${STATUS_LABEL[h.status]} ${new Date(h.at).toLocaleString('en-IN')}`).join(' → ')}</p>
        </Sheet>
      )}
    </>
  )
}

// ------------------------------------------------------------------ users
function Users({ data, reload }) {
  const [role, setRole] = useState('customer')
  const [text, setText] = useState('')
  const list = data.users.filter((u) => u.role === role && (u.name + u.phone + (u.area || '')).toLowerCase().includes(text.toLowerCase()))
  return (
    <>
      <h2 className="page-title">Users</h2>
      <div className="chips">
        {[['customer', 'Customers'], ['owner', 'Shop owners'], ['delivery', 'Delivery partners'], ['admin', 'Admins']].map(([r, l]) => (
          <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{l} ({data.users.filter((u) => u.role === r).length})</button>
        ))}
      </div>
      <div className="search"><span>🔍</span><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name / phone / area" /></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>{role === 'owner' ? 'Shop' : role === 'delivery' ? 'Vehicle / Area' : 'Address'}</th><th>Orders</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name || '—'}</b>{u.role === 'delivery' && <><br /><small className={u.online ? 'green' : 'muted'}>{u.online ? '● online' : '○ offline'}</small></>}</td>
                <td><a href={`tel:${u.phone}`}>{u.phone}</a></td>
                <td><small>{role === 'owner' ? data.shops.filter((s) => s.owner_id === u.id).map((s) => s.name).join(', ') || '—'
                  : role === 'delivery' ? `${u.vehicle || ''} · ${u.area || ''}` : `${u.address || ''} ${u.area ? '· ' + u.area : ''}`}</small></td>
                <td>{role === 'customer' ? data.orders.filter((o) => o.customer_id === u.id).length : role === 'delivery' ? data.orders.filter((o) => o.delivery_id === u.id).length : '—'}</td>
                <td><small>{timeAgo(u.created_at)}</small></td>
                <td><span className={'badge sh-' + (u.status === 'active' ? 'approved' : u.status)}>{u.status}</span></td>
                <td className="nowrap">{u.role !== 'admin' && (
                  u.status === 'active'
                    ? <button className="btn danger sm" onClick={() => confirm(`Block ${u.name}?`) && run(supabase.from('profiles').update({ status: 'blocked' }).eq('id', u.id), reload)}>Block</button>
                    : <button className="btn primary sm" onClick={() => run(supabase.from('profiles').update({ status: 'active' }).eq('id', u.id), reload)}>{u.status === 'pending' ? 'Approve' : 'Unblock'}</button>
                )}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="muted">No users</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ settings
function Settings({ data, reload }) {
  const [f, setF] = useState(data.settings)
  const [msg, setMsg] = useState('')
  const num = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function save() {
    const row = {
      delivery_fee: Number(f.delivery_fee), free_delivery_above: Number(f.free_delivery_above), commission: Number(f.commission),
      delivery_pay: Number(f.delivery_pay), radius_km: Number(f.radius_km), auto_approve_products: !!f.auto_approve_products, support_phone: f.support_phone || '',
    }
    const { error } = await supabase.from('settings').update(row).eq('id', 1)
    setMsg(error ? errMsg(error) : 'Saved ✓'); reload()
    setTimeout(() => setMsg(''), 2000)
  }
  return (
    <>
      <h2 className="page-title">Platform settings</h2>
      <div className="card form">
        <div className="grid2">
          <label>Delivery fee (₹)<input type="number" value={f.delivery_fee} onChange={num('delivery_fee')} /></label>
          <label>Free delivery above (₹)<input type="number" value={f.free_delivery_above} onChange={num('free_delivery_above')} /></label>
          <label>Commission from shops (%)<input type="number" value={f.commission} onChange={num('commission')} /></label>
          <label>Pay to delivery partner per order (₹)<input type="number" value={f.delivery_pay} onChange={num('delivery_pay')} /></label>
          <label>Show shops within (km)<input type="number" value={f.radius_km} onChange={num('radius_km')} /></label>
          <label>Support phone<input value={f.support_phone || ''} onChange={(e) => setF({ ...f, support_phone: e.target.value })} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={!!f.auto_approve_products} onChange={(e) => setF({ ...f, auto_approve_products: e.target.checked })} /> Auto-approve new products from shops (no admin check)</label>
        <button className="btn primary" onClick={save}>{msg || 'Save settings'}</button>
      </div>
    </>
  )
}
