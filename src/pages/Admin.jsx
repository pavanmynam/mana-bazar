import { Fragment, useState, useEffect } from 'react'
import { useStore, CATEGORIES, updateShop, updateUser, updateSettings, setOrderStatus, money, timeAgo, STATUS_LABEL, adminSetPassword } from '../store'
import { DocLink, docLabel, requiredDocs, licenceFor } from './ShopProfile'
import { StatusBadge, BottomNav, Stat } from './ui'

export default function Admin() {
  const { db } = useStore()
  const [tab, setTab] = useState('dashboard')
  useEffect(() => { window.scrollTo(0, 0) }, [tab])
  const pending = db.shops.filter((s) => s.status === 'pending').length
  return (
    <>
      <main className="page wide">
        {tab === 'dashboard' && <Dashboard db={db} goShops={() => setTab('shops')} />}
        {tab === 'shops' && <Shops db={db} />}
        {tab === 'orders' && <AllOrders db={db} />}
        {tab === 'users' && <Users db={db} />}
        {tab === 'settings' && <Settings db={db} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} items={[
        ['dashboard', '📊', 'Dashboard'], ['shops', '🏪', `Shops${pending ? ` (${pending})` : ''}`], ['orders', '🧾', 'Orders'], ['users', '👥', 'Users'], ['settings', '⚙️', 'Settings'],
      ]} />
    </>
  )
}

function Dashboard({ db, goShops }) {
  const delivered = db.orders.filter((o) => o.status === 'delivered')
  const gmv = delivered.reduce((s, o) => s + o.total, 0)
  const commission = Math.round(delivered.reduce((s, o) => s + o.itemTotal, 0) * db.settings.commission / 100)
  const pending = db.shops.filter((s) => s.status === 'pending')
  return (
    <>
      <h2 className="page-title">Admin Dashboard</h2>
      <div className="stats">
        <Stat icon="🏪" label="Active Shops" value={db.shops.filter((s) => s.status === 'approved').length} />
        <Stat icon="🧑" label="Customers" value={db.users.filter((u) => u.role === 'customer').length} />
        <Stat icon="🧾" label="Total Orders" value={db.orders.length} />
        <Stat icon="⏳" label="Live Orders" value={db.orders.filter((o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length} tone="orange" />
        <Stat icon="💰" label="Total Sales (GMV)" value={money(gmv)} tone="green" />
        <Stat icon="🏦" label={`Commission (${db.settings.commission}%)`} value={money(commission)} tone="green" />
      </div>
      {pending.length > 0 && (
        <button className="card warn-card" onClick={goShops}>⏳ <b>{pending.length} shop{pending.length > 1 ? 's' : ''}</b> waiting for approval → Review</button>
      )}
      <h3 className="section-title">Shops by category</h3>
      <div className="card">
        {CATEGORIES.map((c) => {
          const n = db.shops.filter((s) => s.category === c.id && s.status === 'approved').length
          const orders = db.orders.filter((o) => db.shops.find((s) => s.id === o.shopId)?.category === c.id).length
          return <div key={c.id} className="row"><span>{c.icon} {c.name}</span><small>{n} shops · {orders} orders</small></div>
        })}
      </div>
    </>
  )
}

const CHECKS = [
  ['photo', 'Shop photo is real and shows the name board'],
  ['details', 'Department, address & description are correct'],
  ['docs', 'Documents checked (ID, shop proof, licence)'],
  ['phone', 'Called the owner — phone number verified'],
]

function ShopReview({ s, owner, onClose }) {
  const [note, setNote] = useState(s.kycNote || '')
  const done = (k) => (k === 'phone' ? s.phoneVerified && s.checklist.phone : !!s.checklist[k])
  const allDone = CHECKS.every(([k]) => done(k))
  const cat = CATEGORIES.find((c) => c.id === s.category)
  const lic = licenceFor(s.category)
  const missingDocs = requiredDocs(s.category).filter((t) => !s.kycDocs.some((d) => d.type === t))
  function toggle(k, v) {
    const checklist = { ...s.checklist, [k]: v }
    updateShop(s.id, k === 'phone' ? { checklist, phoneVerified: v } : { checklist })
  }
  return (
    <div className="review card">
      <div className="row"><h3>{s.icon} {s.name}</h3><button className="btn ghost sm" onClick={onClose}>✕ Close</button></div>
      <div className="review-grid">
        <div>
          {s.photoUrl ? <a href={s.photoUrl} target="_blank" rel="noreferrer"><img className="review-photo" src={s.photoUrl} alt="Shop" /></a>
            : <div className="review-photo empty">No shop photo yet</div>}
        </div>
        <div className="review-info">
          <p><b>Department:</b> {cat?.icon} {cat?.name}</p>
          <p><b>Address:</b> {s.address || '—'}</p>
          <p><b>About:</b> {s.description || <i className="muted">No description</i>}</p>
          <p><b>Owner:</b> {s.legalName || owner?.name || '—'} · <a href={`tel:${s.phone || owner?.phone}`}>📞 {s.phone || owner?.phone}</a>
            {' '}<a href={`https://wa.me/91${String(s.phone || owner?.phone || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer">WhatsApp</a></p>
          <p><b>{lic.label.replace(' (optional)', '')}:</b> {s[lic.key] || '—'} · <b>GST:</b> {s.gst || '—'}</p>
          <p><b>Documents:</b> {s.kycDocs.length ? s.kycDocs.map((d) => <Fragment key={d.path}><DocLink doc={d} />{' '}</Fragment>) : <i className="muted">none uploaded</i>}</p>
          {missingDocs.length > 0 && <small className="error-text">Missing: {missingDocs.map(docLabel).join(', ')}</small>}
          <p><b>KYC:</b> {s.kycStatus.replace('_', ' ')}</p>
        </div>
      </div>
      <h4>Approval checklist</h4>
      {CHECKS.map(([k, label]) => (
        <label key={k} className="check-row">
          <input type="checkbox" checked={done(k)} onChange={(e) => toggle(k, e.target.checked)} /> {label}
        </label>
      ))}
      <label>Note to owner (shown if you send back)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Shop photo is blurry, please upload again" /></label>
      <div className="actions">
        <button className="btn ghost" onClick={() => { if (!note.trim()) return alert('Write a note so the owner knows what to fix'); updateShop(s.id, { kycStatus: 'rejected', kycNote: note.trim() }) }}>Send back to owner</button>
        <button className="btn primary" disabled={!allDone} title={allDone ? '' : 'Tick all checks first'}
          onClick={() => { updateShop(s.id, { status: 'approved', kycStatus: 'verified', kycNote: '' }); onClose() }}>
          {allDone ? '✅ Approve shop' : `Approve (${CHECKS.filter(([k]) => done(k)).length}/${CHECKS.length} checks)`}
        </button>
      </div>
    </div>
  )
}

function Shops({ db }) {
  const [reviewId, setReviewId] = useState(null)
  const [filter, setFilter] = useState('all')
  const list = db.shops.filter((s) => filter === 'all' || s.status === filter)
  return (
    <>
      <h2 className="page-title">Shops</h2>
      <div className="chips">
        {['all', 'pending', 'approved', 'blocked'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)} ({f === 'all' ? db.shops.length : db.shops.filter((s) => s.status === f).length})
          </button>
        ))}
      </div>
      {reviewId && db.shops.find((x) => x.id === reviewId) && (() => {
        const rs = db.shops.find((x) => x.id === reviewId)
        return <ShopReview s={rs} owner={db.users.find((u) => u.id === rs.ownerId)} onClose={() => setReviewId(null)} />
      })()}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Shop</th><th>Category</th><th>Owner</th><th>Orders</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {list.map((s) => {
              const owner = db.users.find((u) => u.id === s.ownerId)
              const c = CATEGORIES.find((x) => x.id === s.category)
              return (
                <tr key={s.id}>
                  <td><b>{s.icon} {s.name}</b>{s.isSample && <small className="badge">demo</small>}<br /><small className="muted">{s.address}</small>
                    {s.status === 'pending' && <><br /><small className="muted">KYC: {s.kycStatus.replace('_', ' ')} · {CHECKS.filter(([k]) => (k === 'phone' ? s.phoneVerified && s.checklist.phone : s.checklist[k])).length}/{CHECKS.length} checks</small></>}</td>
                  <td>{c?.icon} {c?.name}</td>
                  <td>{owner?.name}<br /><small className="muted">{owner?.phone}</small></td>
                  <td>{db.orders.filter((o) => o.shopId === s.id).length}</td>
                  <td><span className={'badge sh-' + s.status}>{s.status}</span>{s.status === 'approved' && !s.open && <small className="muted"> (closed)</small>}</td>
                  <td className="nowrap">
                    <button className="btn sm" onClick={() => { setReviewId(s.id); window.scrollTo(0, 0) }}>{s.status === 'pending' ? '🔍 Review' : 'View'}</button>
                    {s.status !== 'blocked' && <button className="btn danger sm" onClick={() => confirm(`Block ${s.name}?`) && updateShop(s.id, { status: 'blocked' })}>Block</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function AllOrders({ db }) {
  const [status, setStatus] = useState('all')
  const list = db.orders.filter((o) => status === 'all' || o.status === status)
  return (
    <>
      <h2 className="page-title">All Orders</h2>
      <select className="filter" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All statuses</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Shop</th><th>Customer</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((o) => {
              const shop = db.shops.find((s) => s.id === o.shopId)
              const cust = db.users.find((u) => u.id === o.customerId)
              return (
                <tr key={o.id}>
                  <td><b>#{o.code}</b><br /><small className="muted">{timeAgo(o.createdAt)}</small></td>
                  <td>{shop?.icon} {shop?.name}</td>
                  <td>{cust?.name}<br /><small className="muted">{cust?.phone}</small></td>
                  <td>{money(o.total)}<br /><small className="muted">{o.payment}</small></td>
                  <td><StatusBadge s={o.status} /></td>
                  <td>{!['delivered', 'cancelled', 'rejected'].includes(o.status) &&
                    <button className="btn ghost sm" onClick={() => confirm('Cancel this order?') && setOrderStatus(o.id, 'cancelled')}>Cancel</button>}</td>
                </tr>
              )
            })}
            {list.length === 0 && <tr><td colSpan={6} className="muted">No orders</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

// "Forgot password": the user contacts support, admin sets a temporary password
// here and tells it to them; they can change it later in Profile.
async function resetPassword(u) {
  const temp = String(Math.floor(100000 + Math.random() * 900000))
  const pw = prompt(`New password for ${u.name} (${u.phone}).\nAt least 6 characters. Tell this to the user on call/WhatsApp:`, temp)
  if (pw == null) return
  const r = await adminSetPassword(u.id, pw.trim())
  if (r.error) return alert(r.error)
  alert(`Done ✓\n${u.name} can now login with:\nMobile: ${u.phone}\nPassword: ${pw.trim()}\n\nAsk them to change it in Profile → Change password.`)
}

function Users({ db }) {
  const [role, setRole] = useState('customer')
  const list = db.users.filter((u) => u.role === role)
  return (
    <>
      <h2 className="page-title">Users</h2>
      <div className="chips">
        {[['customer', 'Customers'], ['owner', 'Shop Owners'], ['admin', 'Admins']].map(([r, l]) => (
          <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{l} ({db.users.filter((u) => u.role === r).length})</button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>{role === 'owner' ? 'Shop' : 'Orders'}</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name}</b>{u.address && <><br /><small className="muted">{u.address}</small></>}</td>
                <td>{u.phone}</td>
                <td>{role === 'owner' ? db.shops.find((s) => s.id === u.shopId)?.name : db.orders.filter((o) => o.customerId === u.id).length}</td>
                <td><span className={'badge ' + (u.active ? 'sh-approved' : 'sh-blocked')}>{u.active ? 'active' : 'blocked'}</span></td>
                <td>{u.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className={'btn sm ' + (u.active ? 'danger' : 'primary')} onClick={() => updateUser(u.id, { active: !u.active })}>
                      {u.active ? 'Block' : 'Unblock'}
                    </button>
                    <button className="btn sm" onClick={() => resetPassword(u)}>🔑 Reset password</button>
                  </div>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Settings({ db }) {
  const [f, setF] = useState(db.settings)
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: Number(e.target.value) })
  return (
    <>
      <h2 className="page-title">Platform Settings</h2>
      <div className="card form">
        <div className="grid2">
          <label>Delivery fee ₹<input type="number" value={f.deliveryFee} onChange={set('deliveryFee')} /></label>
          <label>Free delivery above ₹<input type="number" value={f.freeDeliveryAbove} onChange={set('freeDeliveryAbove')} /></label>
          <label>Commission from shops %<input type="number" value={f.commission} onChange={set('commission')} /></label>
        </div>
        <button className="btn primary" onClick={() => { updateSettings(f); setSaved(true); setTimeout(() => setSaved(false), 1500) }}>{saved ? 'Saved ✓' : 'Save'}</button>
      </div>
    </>
  )
}
