import { useAuth } from '../lib/auth'

export function TopBar({ subtitle, children }) {
  const { profile, signOut } = useAuth()
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">🛍️</span>
        <div><b>Mana Bazar</b><small>{subtitle}</small></div>
      </div>
      <div className="topbar-right">
        {children}
        <span className="hello">Hi, {profile?.name?.split(' ')[0]}</span>
        <button className="btn ghost sm" onClick={() => confirm('Logout?') && signOut()}>Logout</button>
      </div>
    </header>
  )
}
