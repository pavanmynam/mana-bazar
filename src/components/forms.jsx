import { useEffect, useState } from 'react'
import { supabase, errMsg } from '../lib/supabase'
import { CATEGORIES, catOf } from '../lib/constants'
import PhotoUpload from './PhotoUpload'
import LocationPicker from './LocationPicker'

const SHOP_FIELDS = ['name', 'category', 'icon', 'description', 'phone', 'address', 'area', 'lat', 'lng', 'photo_url', 'open_time', 'close_time', 'eta', 'upi_id']
const PRIVATE_FIELDS = ['account_holder', 'bank_name', 'account_number', 'ifsc', 'pan', 'gst', 'license_no', 'owner_aadhaar_last4']

// Full shop details: photo, location, timings, UPI, bank / KYC. Used by owner and admin.
export function ShopForm({ shop, isAdmin, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    name: '', category: 'grocery', icon: '🛒', description: '', phone: '', address: '', area: '', lat: null, lng: null,
    photo_url: '', open_time: '07:00', close_time: '22:00', eta: 20, upi_id: '', status: 'approved', ...(shop || {}),
  }))
  const [p, setP] = useState(Object.fromEntries(PRIVATE_FIELDS.map((k) => [k, ''])))
  const [ownerPhone, setOwnerPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setPv = (k) => (e) => setP({ ...p, [k]: e.target.value })

  useEffect(() => {
    if (!shop?.id) return
    supabase.from('shop_private').select('*').eq('shop_id', shop.id).maybeSingle().then(({ data }) => {
      if (data) setP((old) => ({ ...old, ...Object.fromEntries(PRIVATE_FIELDS.map((k) => [k, data[k] || ''])) }))
    })
    if (isAdmin && shop.owner_id) {
      supabase.from('profiles').select('phone').eq('id', shop.owner_id).maybeSingle().then(({ data }) => data && setOwnerPhone(data.phone))
    }
  }, [shop?.id, shop?.owner_id, isAdmin])

  async function save(e) {
    e.preventDefault()
    if (!f.name.trim()) return alert('Shop name is required')
    if (!f.lat) return alert('Please set the shop location on the map (needed to show the shop to nearby customers)')
    setBusy(true)
    try {
      const row = Object.fromEntries(SHOP_FIELDS.map((k) => [k, f[k]]))
      row.eta = Number(row.eta) || 20
      if (isAdmin) {
        row.status = f.status
        if (ownerPhone.trim()) {
          const { data: o } = await supabase.from('profiles').select('id').eq('phone', ownerPhone.replace(/\D/g, '')).eq('role', 'owner').maybeSingle()
          if (!o) throw new Error('No shop-owner account with that mobile number. Ask the owner to register first (Shop Owner → Register).')
          row.owner_id = o.id
        }
      }
      let id = shop?.id
      if (id) {
        const { error } = await supabase.from('shops').update(row).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('shops').insert(row).select('id').single()
        if (error) throw error
        id = data.id
      }
      const { error: pe } = await supabase.from('shop_private').upsert({ shop_id: id, ...p })
      if (pe) throw pe
      onSaved?.(id)
    } catch (ex) { alert(errMsg(ex)) }
    setBusy(false)
  }

  return (
    <form className="card form" onSubmit={save}>
      <h3>{shop?.id ? 'Shop details' : 'Add new shop'}</h3>

      <fieldset><legend>🏪 Basic details</legend>
        <PhotoUpload label="Shop photo (front board / inside)" value={f.photo_url} onChange={(v) => setF({ ...f, photo_url: v })} emoji={f.icon} />
        <div className="grid2">
          <label>Shop name *<input value={f.name} onChange={set('name')} /></label>
          <label>Shop type *
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, icon: catOf(e.target.value).icon })}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <label>Shop phone<input value={f.phone} onChange={set('phone')} inputMode="tel" /></label>
          <label>Delivery time (minutes)<input type="number" value={f.eta} onChange={set('eta')} /></label>
          <label>Opens at<input type="time" value={f.open_time} onChange={set('open_time')} /></label>
          <label>Closes at<input type="time" value={f.close_time} onChange={set('close_time')} /></label>
        </div>
        <label>About the shop<textarea rows={2} value={f.description} onChange={set('description')} placeholder="e.g. All kirana items, wholesale rates, since 1995" /></label>
      </fieldset>

      <fieldset><legend>📍 Shop location *</legend>
        <label>Full address<textarea rows={2} value={f.address} onChange={set('address')} placeholder="Door no, street, area, town" /></label>
        <LocationPicker value={f.lat ? { lat: f.lat, lng: f.lng, label: f.area } : null} height={220}
          onChange={(v) => setF((o) => ({ ...o, lat: v.lat, lng: v.lng, area: v.area || o.area }))} />
        <label>Area name<input value={f.area} onChange={set('area')} placeholder="e.g. Brodipet" /></label>
      </fieldset>

      <fieldset><legend>💰 Payment details</legend>
        <label>UPI ID (customers pay here)<input value={f.upi_id} onChange={set('upi_id')} placeholder="shopname@ybl / 98xxxxxxx@paytm" /></label>
        <small className="muted block">Bank details are private – only you and Mana Bazar admin can see them (for settlements).</small>
        <div className="grid2">
          <label>Account holder name<input value={p.account_holder} onChange={setPv('account_holder')} /></label>
          <label>Bank name<input value={p.bank_name} onChange={setPv('bank_name')} /></label>
          <label>Account number<input value={p.account_number} onChange={setPv('account_number')} inputMode="numeric" /></label>
          <label>IFSC code<input value={p.ifsc} onChange={(e) => setP({ ...p, ifsc: e.target.value.toUpperCase() })} /></label>
        </div>
      </fieldset>

      <fieldset><legend>📄 Business / KYC (optional)</legend>
        <div className="grid2">
          <label>GST number<input value={p.gst} onChange={(e) => setP({ ...p, gst: e.target.value.toUpperCase() })} /></label>
          <label>PAN<input value={p.pan} onChange={(e) => setP({ ...p, pan: e.target.value.toUpperCase() })} /></label>
          <label>Trade / Drug / FSSAI licence no.<input value={p.license_no} onChange={setPv('license_no')} /></label>
          <label>Aadhaar last 4 digits<input value={p.owner_aadhaar_last4} maxLength={4} inputMode="numeric" onChange={setPv('owner_aadhaar_last4')} /></label>
        </div>
      </fieldset>

      {isAdmin && (
        <fieldset><legend>🛡️ Admin</legend>
          <div className="grid2">
            <label>Owner mobile (link owner account)<input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="Owner's registered mobile" /></label>
            <label>Status
              <select value={f.status} onChange={set('status')}>
                <option value="approved">Approved</option><option value="pending">Pending</option><option value="blocked">Blocked</option>
              </select>
            </label>
          </div>
        </fieldset>
      )}

      <div className="actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save shop details'}</button>
      </div>
    </form>
  )
}

// Add / edit product with photo
export function ProductForm({ shop, product, isAdmin, onDone }) {
  const subs = [...catOf(shop.category).subs, 'Other']
  const [f, setF] = useState(() => ({
    name: '', subcategory: subs[0], description: '', price: '', mrp: '', unit: '', photo_url: '', emoji: catOf(shop.category).icon,
    in_stock: true, status: 'approved', ...(product || {}),
  }))
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.price) return alert('Name and price are required')
    setBusy(true)
    const row = {
      shop_id: shop.id, name: f.name.trim(), subcategory: f.subcategory, description: f.description, unit: f.unit,
      price: Number(f.price), mrp: Number(f.mrp || f.price), photo_url: f.photo_url, emoji: f.emoji || '📦', in_stock: f.in_stock,
    }
    if (isAdmin) row.status = f.status
    const { error } = product?.id
      ? await supabase.from('products').update(row).eq('id', product.id)
      : await supabase.from('products').insert(row)
    setBusy(false)
    if (error) return alert(errMsg(error))
    onDone()
  }

  return (
    <form className="card form" onSubmit={save}>
      <h3>{product?.id ? 'Edit product' : 'Add product'} <small className="muted">· {shop.name}</small></h3>
      <PhotoUpload label="Product photo" value={f.photo_url} onChange={(v) => setF({ ...f, photo_url: v })} emoji={f.emoji} />
      <div className="grid2">
        <label>Product name *<input value={f.name} onChange={set('name')} placeholder="e.g. Sona Masoori Rice" /></label>
        <label>Section
          <select value={f.subcategory} onChange={set('subcategory')}>{subs.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label>Selling price ₹ *<input type="number" step="0.01" value={f.price} onChange={set('price')} /></label>
        <label>MRP ₹<input type="number" step="0.01" value={f.mrp} onChange={set('mrp')} /></label>
        <label>Quantity / size<input value={f.unit} onChange={set('unit')} placeholder="1 kg, 500 ml, 1 pc" /></label>
        <label>Icon (if no photo)<input value={f.emoji} onChange={set('emoji')} maxLength={4} /></label>
      </div>
      <label>Description<textarea rows={2} value={f.description} onChange={set('description')} placeholder="Brand, details, expiry info…" /></label>
      <label className="check"><input type="checkbox" checked={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} /> In stock</label>
      {isAdmin && (
        <label>Status
          <select value={f.status} onChange={set('status')}><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select>
        </label>
      )}
      {!isAdmin && !product?.id && <small className="muted block">New products are shown to customers after admin approval.</small>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onDone}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
      </div>
    </form>
  )
}
