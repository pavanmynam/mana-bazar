import { useState } from 'react'
import { uploadPhoto, errMsg } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function PhotoUpload({ value, onChange, label = 'Photo', emoji = '📷' }) {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  async function pick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try { onChange(await uploadPhoto(f, session.user.id)) } catch (err) { alert('Upload failed: ' + errMsg(err)) }
    setBusy(false)
    e.target.value = ''
  }
  return (
    <div className="photo-up">
      <span className="lbl">{label}</span>
      <div className="photo-row">
        <div className="photo-prev">{value ? <img src={value} alt="" /> : <span>{emoji}</span>}</div>
        <div className="photo-btns">
          <label className="btn ghost sm file-btn">
            {busy ? 'Uploading…' : value ? 'Change photo' : '📷 Upload photo'}
            <input type="file" accept="image/*" onChange={pick} disabled={busy} />
          </label>
          {value && <button type="button" className="btn ghost sm" onClick={() => onChange('')}>Remove</button>}
          <small className="muted">Camera or gallery. Auto-compressed.</small>
        </div>
      </div>
    </div>
  )
}
