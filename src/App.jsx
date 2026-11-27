import { useStore, logout } from './store'
import Auth from './pages/Auth'
import Customer from './pages/Customer'
import Owner from './pages/Owner'
import Admin from './pages/Admin'
import Legal, { legalSlugFromPath } from './pages/Legal'

export default function App() {
  const legal = legalSlugFromPath(window.location.pathname)
  if (legal) return <Legal slug={legal} />
  return <MainApp />
}

function MainApp() {
  const { db, session, ready } = useStore()
  const user = db.users.find((u) => u.id === session.userId)

  if (!ready || (session.userId && !user)) {
    return <div className="auth"><div className="auth-hero"><div className="logo-big">🛍️</div><h1>Mana Bazar</h1><p>Loading…</p></div></div>
  }
  if (!user) return <Auth />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🛍️</span>
          <div>
            <b>Mana Bazar</b>
            <small>{user.role === 'admin' ? 'Admin Panel' : user.role === 'owner' ? 'Shop Partner' : 'All shops, one app'}</small>
          </div>
        </div>
        <div className="topbar-right">
          <span className="hello">Hi, {user.name.split(' ')[0]}</span>
          <button className="btn ghost sm" onClick={logout}>Logout</button>
        </div>
      </header>
      {user.role === 'customer' && <Customer user={user} />}
      {user.role === 'owner' && <Owner user={user} />}
      {user.role === 'admin' && <Admin user={user} />}
      {user.role === 'delivery' && (
        <main className="page"><div className="card center"><div className="logo-big">🛵</div><h2>Delivery Partner app</h2><p>Coming soon. Admin will contact you once your account is approved.</p></div></main>
      )}
    </div>
  )
}
