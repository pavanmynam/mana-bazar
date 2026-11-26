import { useState } from 'react'
import { CATEGORIES, login, registerCustomer, registerOwner, createFirstAdmin, resetDemo, useStore } from '../store'

const ROLES = [
  { id: 'customer', label: 'Customer', icon: '🧑' },
  { id: 'owner', label: 'Shop Owner', icon: '🏪' },
  { id: 'admin', label: 'Admin', icon: '🛡️' },
]

export default function Auth() {
  const { db } = useStore()
  const adminExists = db.users.some((u) => u.role === 'admin')
  const [role, setRole] = useState('customer')
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ phone: '', password: '', name: '', address: '', shopName: '', category: 'grocery' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const r = ROLES.find((x) => x.id === role)
  const adminSetup = role === 'admin' && !adminExists

  function submit(e) {
    e.preventDefault()
    setErr('')
    let msg
    if (adminSetup) msg = createFirstAdmin({ username: f.phone, password: f.password })
    else if (mode === 'login') msg = login(f.phone, f.password, role)
    else if (!f.name || !f.phone || !f.password) msg = 'Please fill all fields'
    else if (role === 'customer') msg = registerCustomer(f)
    else if (!f.shopName || !f.address) msg = 'Please fill shop name and address'
    else msg = registerOwner(f)
    if (msg) setErr(msg)
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="logo-big">🛍️</div>
        <h1>Mana Bazar</h1>
        <p>మన ఊరి అన్ని షాపులు – ఒకే యాప్ లో</p>
        <div className="hero-cats">{CATEGORIES.map((c) => <span key={c.id} title={c.name}>{c.icon}</span>)}</div>
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <div className="role-tabs">
          {ROLES.map((x) => (
            <button type="button" key={x.id} className={role === x.id ? 'active' : ''}
              onClick={() => { setRole(x.id); setMode('login'); setErr('') }}>
              <span>{x.icon}</span>{x.label}
            </button>
          ))}
        </div>

        <h2>
          {adminSetup ? 'Create Admin Account'
            : mode === 'login' ? `${r.label} Login`
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
        <label>Password<input type="password" value={f.password} onChange={set('password')} placeholder={adminSetup ? 'choose a password' : 'Password'} /></label>

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
        <button className="btn primary block">
          {adminSetup ? 'Create Admin Account' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        {role !== 'admin' && (
          <p className="switch">
            {mode === 'login' ? 'New here? ' : 'Already registered? '}
            <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}>
              {mode === 'login' ? (role === 'owner' ? 'Register your shop' : 'Create account') : 'Login'}
            </a>
          </p>
        )}
      </form>
      <button className="reset-link" onClick={() => confirm('This clears all real shops, orders and accounts and brings back only the sample catalog. Continue?') && resetDemo()}>
        Reset to sample catalog
      </button>
    </div>
  )
}
