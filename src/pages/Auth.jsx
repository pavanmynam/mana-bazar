import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, errMsg } from '../lib/supabase'
import { CATEGORIES } from '../lib/constants'

const ROLES = [
  { id: 'customer', label: 'Customer', icon: '🧑' },
  { id: 'owner', label: 'Shop Owner', icon: '🏪' },
  { id: 'delivery', label: 'Delivery', icon: '🛵' },
  { id: 'admin', label: 'Admin', icon: '🛡️' },
]
const VEHICLES = ['Bike', 'Scooty', 'Cycle', 'Auto']

export default function Auth() {
  const { signIn, signUp, reloadProfile } = useAuth()
  const [role, setRole] = useState('customer')
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ phone: '', password: '', name: '', shopName: '', category: 'grocery', vehicle: 'Bike', area: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [adminExists, setAdminExists] = useState(true)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const r = ROLES.find((x) => x.id === role)

  useEffect(() => { supabase.rpc('admin_exists').then(({ data }) => setAdminExists(data !== false)) }, [])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    const phone = f.phone.replace(/\D/g, '')
    if (phone.length !== 10) return setErr('Enter a valid 10-digit mobile number')
    if (f.password.length < 6) return setErr('Password must be at least 6 characters')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(phone, f.password, role)
      } else {
        if (!f.name.trim()) throw new Error('Please enter your name')
        if (role === 'owner' && !f.shopName.trim()) throw new Error('Please enter shop name')
        const user = await signUp(phone, f.password, role, { name: f.name.trim(), vehicle: f.vehicle, area: f.area })
        if (role === 'owner') {
          const cat = CATEGORIES.find((c) => c.id === f.category)
          const { error } = await supabase.from('shops').insert({ owner_id: user.id, name: f.shopName.trim(), category: f.category, icon: cat.icon, phone })
          if (error) throw error
        }
        if (role === 'admin') {
          const { error } = await supabase.rpc('claim_admin')
          if (error) throw error
        }
        await reloadProfile()
      }
    } catch (ex) {
      setErr(errMsg(ex))
    }
    setBusy(false)
  }

  const canRegister = role !== 'admin' || !adminExists

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="logo-big">🛍️</div>
        <h1>Mana Bazar</h1>
        <p>మన ఊరి అన్ని షాపులు – ఒకే యాప్ లో</p>
        <div className="hero-cats">{CATEGORIES.map((c) => <span key={c.id} title={c.name}>{c.icon}</span>)}</div>
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <div className="role-tabs four">
          {ROLES.map((x) => (
            <button type="button" key={x.id} className={role === x.id ? 'active' : ''}
              onClick={() => { setRole(x.id); setMode('login'); setErr('') }}>
              <span>{x.icon}</span>{x.label}
            </button>
          ))}
        </div>

        <h2>{mode === 'login' ? `${r.label} Login`
          : role === 'owner' ? 'Register your Shop' : role === 'delivery' ? 'Join as Delivery Partner'
            : role === 'admin' ? 'Create Admin Account' : 'Create Account'}</h2>

        {mode === 'register' && <label>Your Name<input value={f.name} onChange={set('name')} placeholder="Full name" /></label>}
        <label>Mobile Number
          <input value={f.phone} onChange={set('phone')} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} autoComplete="username" />
        </label>
        <label>Password
          <input type="password" value={f.password} onChange={set('password')} placeholder="Min 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>

        {mode === 'register' && role === 'owner' && (
          <>
            <label>Shop Name<input value={f.shopName} onChange={set('shopName')} placeholder="e.g. Sri Sai Kirana" /></label>
            <label>Shop Type
              <select value={f.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </label>
            <small className="muted block">After registering you will add photos, location, bank / UPI details. Admin approves your shop.</small>
          </>
        )}
        {mode === 'register' && role === 'delivery' && (
          <>
            <label>Vehicle
              <select value={f.vehicle} onChange={set('vehicle')}>{VEHICLES.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label>Your Area / Town<input value={f.area} onChange={set('area')} placeholder="e.g. Brodipet, Guntur" /></label>
          </>
        )}

        {err && <div className="error">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}</button>

        {canRegister && (
          <p className="switch">
            {mode === 'login' ? (role === 'admin' ? 'First time setup? ' : 'New here? ') : 'Already registered? '}
            <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}>
              {mode === 'login'
                ? role === 'owner' ? 'Register your shop' : role === 'delivery' ? 'Join as delivery partner' : role === 'admin' ? 'Create admin account' : 'Create account'
                : 'Login'}
            </a>
          </p>
        )}
      </form>
    </div>
  )
}
