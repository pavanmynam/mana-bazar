import { useState } from 'react'
import { updateShop, uploadPhoto, uploadKycDoc, kycDocUrl, CATEGORIES } from '../store'

// Which licence each department needs (shown to the owner and the admin).
export function licenceFor(category) {
  const food = ['restaurant', 'bakery', 'sweets', 'dairy', 'fruits', 'grocery', 'supermarket']
  if (category === 'medical') return { key: 'drugLicense', label: 'Drug Licence number', doc: 'drug_licence' }
  if (food.includes(category)) return { key: 'fssai', label: 'FSSAI number', doc: 'fssai' }
  return { key: 'tradeLicense', label: 'Trade Licence number (optional)', doc: 'trade_licence' }
}

export const DOC_TYPES = [
  ['owner_id', 'Owner ID proof (Aadhaar / PAN)'],
  ['shop_proof', 'Shop proof (rent agreement / electricity bill / shop board photo)'],
  ['fssai', 'FSSAI certificate'],
  ['drug_licence', 'Drug licence'],
  ['trade_licence', 'Trade licence'],
  ['gst', 'GST certificate'],
  ['other', 'Other document'],
]
export const docLabel = (t) => (DOC_TYPES.find(([k]) => k === t) || [t, t])[1]

export function requiredDocs(category) {
  return ['owner_id', 'shop_proof', ...(licenceFor(category).doc !== 'trade_licence' ? [licenceFor(category).doc] : [])]
}

// One photo with a camera/gallery picker.
export function PhotoPicker({ url, onChange, label = 'Add photo', big }) {
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const r = await uploadPhoto(file)
    setBusy(false)
    if (r.error) return alert(r.error)
    onChange(r.url)
  }
  return (
    <label className={'photo-pick' + (big ? ' big' : '') + (url ? ' has' : '')}>
      {url ? <img src={url} alt="" /> : <span>{busy ? 'Uploading…' : `📷 ${label}`}</span>}
      {url && busy && <span className="photo-busy">Uploading…</span>}
      <input type="file" accept="image/*" onChange={pick} hidden />
    </label>
  )
}

// Up to `max` photos; first one is the cover.
export function MultiPhotoPicker({ images, onChange, max = 5 }) {
  const [busy, setBusy] = useState(false)
  async function add(e) {
    const files = [...(e.target.files || [])].slice(0, max - images.length)
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    const urls = []
    for (const f of files) {
      const r = await uploadPhoto(f)
      if (r.error) { alert(r.error); break }
      urls.push(r.url)
    }
    setBusy(false)
    onChange([...images, ...urls].slice(0, max))
  }
  const move = (i) => { const a = [...images]; const [x] = a.splice(i, 1); a.unshift(x); onChange(a) }
  return (
    <div className="multi-photos">
      {images.map((u, i) => (
        <div key={u} className="mp-item">
          <img src={u} alt="" onClick={() => move(i)} title="Tap to make cover photo" />
          {i === 0 && <span className="mp-cover">Cover</span>}
          <button type="button" onClick={() => onChange(images.filter((x) => x !== u))} aria-label="Remove photo">✕</button>
        </div>
      ))}
      {images.length < max && (
        <label className="mp-add">
          {busy ? '…' : <>📷<small>{images.length}/{max}</small></>}
          <input type="file" accept="image/*" multiple onChange={add} hidden />
        </label>
      )}
    </div>
  )
}

// Shop photo, description and KYC documents — used by the owner (editable)
// both while waiting for approval and later in shop settings.
export function ShopProfileEditor({ shop }) {
  const lic = licenceFor(shop.category)
  const [f, setF] = useState({
    description: shop.description, photoUrl: shop.photoUrl, legalName: shop.legalName,
    gst: shop.gst, [lic.key]: shop[lic.key] || '',
  })
  const [docs, setDocs] = useState(shop.kycDocs || [])
  const [docType, setDocType] = useState(requiredDocs(shop.category).find((t) => !docs.some((d) => d.type === t)) || 'other')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const missing = requiredDocs(shop.category).filter((t) => !docs.some((d) => d.type === t))

  async function addDoc(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const r = await uploadKycDoc(file, docType)
    setBusy(false)
    if (r.error) return alert(r.error)
    const next = [...docs, r.doc]
    setDocs(next)
    await updateShop(shop.id, { kycDocs: next })
    const nextMissing = requiredDocs(shop.category).find((t) => !next.some((d) => d.type === t))
    if (nextMissing) setDocType(nextMissing)
  }
  async function removeDoc(d) {
    const next = docs.filter((x) => x.path !== d.path)
    setDocs(next)
    await updateShop(shop.id, { kycDocs: next })
  }
  async function save(submit) {
    if (submit) {
      if (!f.photoUrl) return setMsg('Please add a shop photo')
      if ((f.description || '').trim().length < 20) return setMsg('Please write a shop description (at least 20 letters)')
      if (!f.legalName.trim()) return setMsg("Please enter the owner's name as on ID proof")
      if (missing.length) return setMsg('Please upload: ' + missing.map(docLabel).join(', '))
    }
    await updateShop(shop.id, { ...f, ...(submit ? { kycStatus: 'submitted' } : {}) })
    setMsg(submit ? 'Sent to Mee Bazar for verification ✓' : 'Saved ✓')
    setTimeout(() => setMsg(''), 2500)
  }

  const kycBadge = { not_submitted: ['Not submitted', 'sh-pending'], submitted: ['Under review', 'sh-pending'], verified: ['Verified ✓', 'sh-approved'], rejected: ['Rejected', 'sh-blocked'] }[shop.kycStatus] || ['', '']
  return (
    <div className="card form shop-profile">
      <div className="row"><h3>Shop profile & documents</h3><span className={'badge ' + kycBadge[1]}>{kycBadge[0]}</span></div>
      {shop.kycStatus === 'rejected' && shop.kycNote && <div className="warn">Admin note: {shop.kycNote}</div>}

      <b>Shop photo</b>
      <small className="muted">A clear photo of the shop front with the name board. Customers see this.</small>
      <PhotoPicker big url={f.photoUrl} onChange={(u) => setF({ ...f, photoUrl: u })} label="Add shop photo" />

      <label>Department<input value={(CATEGORIES.find((c) => c.id === shop.category) || {}).name || shop.category} disabled /></label>
      <label>About your shop
        <textarea rows={3} value={f.description} onChange={set('description')} maxLength={500}
          placeholder="What you sell, speciality, since when, timings. e.g. Fresh groceries, rice & dals at wholesale rates. Open 7 AM – 10 PM." />
      </label>
      <div className="grid2">
        <label>Owner name (as on ID)<input value={f.legalName} onChange={set('legalName')} /></label>
        <label>{lic.label}<input value={f[lic.key]} onChange={set(lic.key)} /></label>
        <label>GST number (optional)<input value={f.gst} onChange={set('gst')} /></label>
      </div>

      <b style={{ marginTop: 8 }}>Documents</b>
      <small className="muted">Photos or PDF. Only you and Mee Bazar admin can see these.</small>
      {docs.map((d) => (
        <div key={d.path} className="doc-row">
          <span>📄 {docLabel(d.type)}<small className="muted"> · {d.name}</small></span>
          <button type="button" className="icon-btn" onClick={() => removeDoc(d)} aria-label="Remove">🗑️</button>
        </div>
      ))}
      {missing.length > 0 && <small className="error-text">Still needed: {missing.map(docLabel).join(', ')}</small>}
      <div className="doc-add">
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="btn sm">{busy ? 'Uploading…' : '⬆️ Upload'}
          <input type="file" accept="image/*,application/pdf" onChange={addDoc} hidden />
        </label>
      </div>

      {msg && <small className={msg.includes('✓') ? 'muted' : 'error-text'}>{msg}</small>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => save(false)}>Save</button>
        {shop.kycStatus !== 'verified' && <button type="button" className="btn primary" onClick={() => save(true)}>Submit for verification</button>}
      </div>
    </div>
  )
}

// Admin: open a private document in a new tab (link is valid for 10 minutes).
export function DocLink({ doc }) {
  const [busy, setBusy] = useState(false)
  async function open() {
    setBusy(true)
    const w = window.open('', '_blank')
    const url = await kycDocUrl(doc.path)
    setBusy(false)
    if (url && w) w.location = url
    else { w?.close(); alert('Could not open this document') }
  }
  return <button type="button" className="link" onClick={open}>{busy ? 'Opening…' : `📄 ${docLabel(doc.type)}`}</button>
}
