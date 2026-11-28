import { useState } from 'react'
import { CATEGORIES, login, registerCustomer, registerOwner, createFirstAdmin, useStore } from '../store'
import { LegalLinks, BUSINESS } from './Legal'

const ROLES = [
  { id: 'customer', label: 'Customer', icon: '🧑' },
  { id: 'owner', label: 'Shop Owner', icon: '🏪' },
  { id: 'delivery', label: 'Delivery Partner', icon: '🛵' },
  { id: 'admin', label: 'Admin', icon: '🛡️' },
]

// Each kind of user has their own link (like Swiggy / Swiggy Partner / Swiggy Delivery):
//   /          customers      /partner   shop owners
//   /delivery  riders         /admin     admin (not linked anywhere)
export const ROLE_PATHS = { customer: '/', owner: '/partner', delivery: '/delivery', admin: '/admin' }
export function roleFromPath(path = window.location.pathname) {
  const p = path.replace(/\/+$/, '').toLowerCase()
  if (p === '/partner' || p === '/shop') return 'owner'
  if (p === '/delivery' || p === '/rider') return 'delivery'
  if (p === '/admin') return 'admin'
  return 'customer'
}
const HERO = {
  customer: ['🛍️', 'Mana Bazar', 'మన ఊరి అన్ని షాపులు – ఒకే యాప్ లో'],
  owner: ['🏪', 'Mana Bazar Partner', 'మీ షాపును ఉచితంగా ఆన్‌లైన్ లో పెట్టండి'],
  delivery: ['🛵', 'Mana Bazar Delivery', 'డెలివరీ చేసి సంపాదించండి'],
  admin: ['🛡️', 'Mana Bazar Admin', 'Staff only'],
}

export default function Auth() {
  const { adminExists } = useStore()
  const [busy, setBusy] = useState(false)
  const role = roleFromPath()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ phone: '', password: '', password2: '', name: '', address: '', shopName: '', category: 'grocery' })
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const r = ROLES.find((x) => x.id === role)
  const adminSetup = role === 'admin' && !adminExists

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setErr('')
    setBusy(true)
    let msg
    try {
      if (adminSetup) msg = await createFirstAdmin({ username: f.phone, password: f.password })
      else if (mode === 'login') msg = await login(f.phone.trim(), f.password, role)
      else if (!f.name || !f.phone || !f.password) msg = 'Please fill all fields'
      else if (!/^[6-9]\d{9}$/.test(f.phone.trim())) msg = 'Enter a valid 10-digit mobile number'
      else if (f.password.length < 6) msg = 'Password must be at least 6 characters'
      else if (f.password !== f.password2) msg = 'Passwords do not match — please type the same password twice'
      else if (role === 'customer') msg = await registerCustomer(f)
      else if (!f.shopName || !f.address) msg = 'Please fill shop name and address'
      else msg = await registerOwner(f)
    } catch (ex) {
      msg = ex?.message || 'Network problem, please try again'
    }
    setBusy(false)
    if (msg) setErr(msg)
  }

  return (
    <div className="auth">
      <div className={'auth-hero role-' + role}>
        <div className="logo-big">{HERO[role][0]}</div>
        <h1>{HERO[role][1]}</h1>
        <p>{HERO[role][2]}</p>
        {role === 'customer' && <div className="hero-cats">{CATEGORIES.map((c) => <span key={c.id} title={c.name}>{c.icon}</span>)}</div>}
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <h2>
          {adminSetup ? 'Create Admin Account'
            : mode === 'login' ? (role === 'customer' ? 'Login' : `${r.label} Login`)
              : role === 'owner' ? 'Register your Shop' : 'Create Account'}
        </h2>
        {adminSetup && (
          <p className="muted" style={{ marginTop: -4 }}>
            No admin account exists yet. Choose your own username and password — this becomes the only admin login.
          </p>
        )}

        {mode === 'register' && !adminSetup && (
          <label>Your Name<input value={f.name} onChange={set('name')} placeholder="Full name" /></label>
        )}
        <label>{role === 'admin' ? 'Username' : 'Mobile Number'}
          <input value={f.phone} onChange={set('phone')} placeholder={role === 'admin' ? 'choose a username' : '10-digit mobile'} inputMode={role === 'admin' ? 'text' : 'numeric'} />
        </label>
        <label>Password
          <span className="pw-row">
            <input type={showPw ? 'text' : 'password'} value={f.password} onChange={set('password')} placeholder={adminSetup || mode === 'register' ? 'min 6 characters' : 'Password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
            <button type="button" className="pw-eye" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? '🙈' : '👁️'}</button>
          </span>
        </label>
        {mode === 'register' && !adminSetup && (
          <>
            <label>Confirm Password<input type={showPw ? 'text' : 'password'} value={f.password2} onChange={set('password2')} placeholder="type the same password again" autoComplete="new-password" /></label>
            <small className="muted">🔐 Remember this password — you will use your mobile number + this password to login. Forgot it later? Tap "Forgot password?" on the login screen.</small>
          </>
        )}

        {mode === 'register' && role === 'owner' && (
          <>
            <label>Shop Name<input value={f.shopName} onChange={set('shopName')} placeholder="e.g. Sri Sai Kirana" /></label>
            <label>Shop Type
              <select value={f.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </label>
          </>
        )}
        {mode === 'register' && (
          <label>{role === 'owner' ? 'Shop Address' : 'Delivery Address'}
            <textarea rows={2} value={f.address} onChange={set('address')} placeholder="Door no, street, area, city" />
          </label>
        )}

        {err && <div className="error">{err}</div>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Please wait…' : adminSetup ? 'Create Admin Account' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        {mode === 'login' && role !== 'admin' && (
          <p className="switch" style={{ marginTop: 4 }}>
            <a href={`https://wa.me/${BUSINESS.phoneRaw}?text=${encodeURIComponent(`Hi Mana Bazar, I forgot my password. Please reset it.\nAccount type: ${role === 'owner' ? 'Shop owner' : role === 'delivery' ? 'Delivery partner' : 'Customer'}\nRegistered mobile: ${f.phone || ''}`)}`}
              target="_blank" rel="noreferrer">Forgot password?</a>
            <small className="muted" style={{ display: 'block' }}>We'll reset it on WhatsApp and send you a new password.</small>
          </p>
        )}
        {role !== 'admin' && role !== 'delivery' && (
          <p className="switch">
            {mode === 'login' ? 'New here? ' : 'Already registered? '}
            <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}>
              {mode === 'login' ? (role === 'owner' ? 'Register your shop' : 'Create account') : 'Login'}
            </a>
          </p>
        )}
        {mode === 'register' && (
          <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
            By registering you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        )}
        {role === 'delivery' && <p className="muted center-text">Want to deliver with Mana Bazar? WhatsApp us at <a href={`https://wa.me/${BUSINESS.phoneRaw}`}>{BUSINESS.phone}</a> to join.</p>}
      </form>
      {role === 'customer' && (
        <a className="partner-cta" href="/partner">🏪 Own a shop? <b>Sell on Mana Bazar →</b></a>
      )}
      {role !== 'customer' && <a className="partner-cta" href="/">← Back to Mana Bazar shopping</a>}
      <LegalLinks />
    </div>
  )
}
