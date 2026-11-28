import { useStore, logout } from './store'
import Auth, { roleFromPath, ROLE_PATHS } from './pages/Auth'
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
    return <div className="auth"><div className="auth-hero"><div className="logo-big">🛍️</div><h1>Mee Bazar</h1><p>Loading…</p></div></div>
  }
  if (!user) return <Auth />
  // Logged in but opened another role's link (e.g. owner opening /admin): send to their own page.
  const want = roleFromPath()
  if (want !== user.role && window.location.pathname !== ROLE_PATHS[user.role]) {
    if (want !== 'customer' || user.role !== 'customer') window.history.replaceState(null, '', ROLE_PATHS[user.role] + window.location.search)
  }

  return (
    <div className="app">
      <header className={'topbar role-' + user.role}>
        <div className="brand">
          <img className="logo-img" src="/logo.png" alt="" width="38" height="38" />
          <div>
            <b>Mee Bazar <span className="te">మీ బజార్</span></b>
            <small>{user.role === 'admin' ? 'Admin Panel' : user.role === 'owner' ? 'Shop Partner' : 'మీ ఊరి షాపులు · ఇంటికే డెలివరీ'}</small>
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
