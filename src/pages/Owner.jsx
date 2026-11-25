import { useState, useEffect } from 'react'
import {
  useStore, CATEGORIES, updateShop, saveProduct, deleteProduct, setOrderStatus, money, timeAgo, ORDER_STEPS, STATUS_LABEL,
} from '../store'
import { StatusBadge, BottomNav, Stat } from './ui'

const NEXT_LABEL = { placed: 'Accept Order', accepted: 'Mark Packed', packed: 'Out for Delivery', out_for_delivery: 'Mark Delivered' }

export default function Owner({ user }) {
  const { db } = useStore()
  const [tab, setTab] = useState('orders')
  useEffect(() => { window.scrollTo(0, 0) }, [tab])
  const shop = db.shops.find((s) => s.id === user.shopId)

  if (!shop) return <main className="page"><div className="empty">Shop not found</div></main>

  if (shop.status !== 'approved') {
    return (
      <main className="page">
        <div className="card center">
          <div className="logo-big">{shop.status === 'pending' ? '⏳' : '⛔'}</div>
          <h2>{shop.name}</h2>
          {shop.status === 'pending'
            ? <p>Your shop is waiting for <b>Admin approval</b>. Once approved, customers can see your shop and place orders.</p>
            : <p>Your shop has been <b>blocked</b> by Admin. Please contact Mana Bazar support.</p>}
          <small className="muted">Tip (demo): login as Admin → Shops → Approve.</small>
        </div>
      </main>
    )
  }

  const orders = db.orders.filter((o) => o.shopId === shop.id)
  const newCount = orders.filter((o) => o.status === 'placed').length

  return (
    <>
      <main className="page">
        <div className="owner-head">
          <div>
            <h2>{shop.icon} {shop.name}</h2>
            <small className="muted">{CATEGORIES.find((c) => c.id === shop.category)?.name} · {shop.address}</small>
          </div>
          <label className="switch-toggle">
            <input type="checkbox" checked={shop.open} onChange={(e) => updateShop(shop.id, { open: e.target.checked })} />
            <span className="slider" />
            <b>{shop.open ? 'OPEN' : 'CLOSED'}</b>
          </label>
        </div>
        {tab === 'orders' && <Orders db={db} orders={orders} />}
        {tab === 'products' && <Products db={db} shop={shop} />}
        {tab === 'dashboard' && <Dashboard db={db} orders={orders} shop={shop} />}
        {tab === 'shop' && <ShopSettings shop={shop} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} items={[
        ['orders', '📥', `Orders${newCount ? ` (${newCount})` : ''}`], ['products', '📦', 'Products'], ['dashboard', '📊', 'Earnings'], ['shop', '⚙️', 'Shop'],
      ]} />
    </>
  )
}

function Orders({ db, orders }) {
  const [filter, setFilter] = useState('active')
  const list = orders.filter((o) =>
    filter === 'active' ? !['delivered', 'cancelled', 'rejected'].includes(o.status) : ['delivered', 'cancelled', 'rejected'].includes(o.status))
  return (
    <>
      <div className="chips">
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active</button>
        <button className={filter === 'past' ? 'active' : ''} onClick={() => setFilter('past')}>Completed</button>
      </div>
      {list.length === 0 && <div className="empty">No {filter} orders</div>}
      {list.map((o) => {
        const cust = db.users.find((u) => u.id === o.customerId)
        const i = ORDER_STEPS.indexOf(o.status)
        const next = ORDER_STEPS[i + 1]
        return (
          <div key={o.id} className={'card order-card' + (o.status === 'placed' ? ' new' : '')}>
            <div className="row"><b>#{o.id}</b><StatusBadge s={o.status} /></div>
            <small className="muted">{timeAgo(o.createdAt)} · {o.payment}</small>
            <ul className="items">{o.items.map((it) => <li key={it.productId}>{it.emoji} {it.name} × <b>{it.qty}</b> <span>{money(it.price * it.qty)}</span></li>)}</ul>
            <div className="row"><span>👤 {cust?.name} · 📞 {cust?.phone}</span><b>{money(o.total)}</b></div>
            <small className="muted">📍 {o.address}</small>
            {o.note && <small className="note">📝 {o.note}</small>}
            {next && (
              <div className="actions">
                {o.status === 'placed' && <button className="btn danger" onClick={() => confirm('Reject this order?') && setOrderStatus(o.id, 'rejected')}>Reject</button>}
                <button className="btn primary" onClick={() => setOrderStatus(o.id, next)}>{NEXT_LABEL[o.status]} →</button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

const empty = { name: '', price: '', mrp: '', unit: '', emoji: '📦' }

function Products({ db, shop }) {
  const products = db.products.filter((p) => p.shopId === shop.id)
  const [edit, setEdit] = useState(null)

  function save(e) {
    e.preventDefault()
    if (!edit.name || !edit.price) return alert('Name and price are required')
    saveProduct({ ...edit, shopId: shop.id, price: Number(edit.price), mrp: Number(edit.mrp || edit.price) })
    setEdit(null)
  }

  return (
    <>
      <div className="row">
        <h3 className="section-title">{products.length} Products</h3>
        <button className="btn primary sm" onClick={() => setEdit({ ...empty })}>+ Add Product</button>
      </div>
      {edit && (
        <form className="card form" onSubmit={save}>
          <h3>{edit.id ? 'Edit Product' : 'New Product'}</h3>
          <div className="grid2">
            <label>Name<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Basmati Rice" /></label>
            <label>Icon (emoji)<input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} maxLength={4} /></label>
            <label>Selling Price ₹<input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></label>
            <label>MRP ₹<input type="number" value={edit.mrp} onChange={(e) => setEdit({ ...edit, mrp: e.target.value })} /></label>
            <label>Unit / Size<input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="1 kg, 500 ml, 1 pc" /></label>
          </div>
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn primary">Save</button>
          </div>
        </form>
      )}
      <div className="products">
        {products.map((p) => (
          <div key={p.id} className={'product' + (p.inStock ? '' : ' oos')}>
            <div className="p-emoji">{p.emoji}</div>
            <div className="p-info">
              <b>{p.name}</b>
              <small>{p.unit}</small>
              <div><span className="price">{money(p.price)}</span>{p.mrp > p.price && <s>{money(p.mrp)}</s>}</div>
            </div>
            <div className="p-actions">
              <label className="switch-toggle sm">
                <input type="checkbox" checked={p.inStock} onChange={(e) => saveProduct({ id: p.id, inStock: e.target.checked })} />
                <span className="slider" /><small>{p.inStock ? 'In stock' : 'Out'}</small>
              </label>
              <div>
                <button className="icon-btn" onClick={() => setEdit({ ...p })}>✏️</button>
                <button className="icon-btn" onClick={() => confirm(`Delete ${p.name}?`) && deleteProduct(p.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Dashboard({ db, orders }) {
  const delivered = orders.filter((o) => o.status === 'delivered')
  const sales = delivered.reduce((s, o) => s + o.itemTotal, 0)
  const commission = Math.round((sales * db.settings.commission) / 100)
  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
  return (
    <>
      <div className="stats">
        <Stat icon="🧾" label="Total Orders" value={orders.length} />
        <Stat icon="📅" label="Today's Orders" value={todayOrders.length} />
        <Stat icon="✅" label="Delivered" value={delivered.length} tone="green" />
        <Stat icon="💰" label="Total Sales" value={money(sales)} tone="orange" />
      </div>
      <div className="card bill">
        <div><span>Sales (delivered)</span><span>{money(sales)}</span></div>
        <div><span>Mana Bazar commission ({db.settings.commission}%)</span><span>− {money(commission)}</span></div>
        <div className="total"><span>Your Earnings</span><span>{money(sales - commission)}</span></div>
      </div>
      <h3 className="section-title">Order status summary</h3>
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

function ShopSettings({ shop }) {
  const [f, setF] = useState({ name: shop.name, address: shop.address, phone: shop.phone, eta: shop.eta, icon: shop.icon, category: shop.category })
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="card form">
      <h3>Shop Details</h3>
      <div className="grid2">
        <label>Shop Name<input value={f.name} onChange={set('name')} /></label>
        <label>Icon<input value={f.icon} onChange={set('icon')} maxLength={4} /></label>
        <label>Category
          <select value={f.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </label>
        <label>Phone<input value={f.phone} onChange={set('phone')} /></label>
        <label>Delivery time (min)<input type="number" value={f.eta} onChange={set('eta')} /></label>
      </div>
      <label>Address<textarea rows={2} value={f.address} onChange={set('address')} /></label>
      <button className="btn primary" onClick={() => { updateShop(shop.id, { ...f, eta: Number(f.eta) }); setSaved(true); setTimeout(() => setSaved(false), 1500) }}>
        {saved ? 'Saved ✓' : 'Save Changes'}
      </button>
    </div>
  )
}
