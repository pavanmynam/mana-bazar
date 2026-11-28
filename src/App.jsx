import { useStore, logout } from './store'
import Auth, { roleFromPath, ROLE_PATHS } from './pages/Auth'
import Customer from './pages/Customer'
import Owner from './pages/Owner'
import Admin from './pages/Admin'
import Delivery from './pages/Delivery'
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
  // Logged in but opened another role's link (e.g. admin opening /delivery on
  // the same phone): ask instead of silently showing the other panel.
  const want = roleFromPath()
  if (want !== user.role && want !== 'customer') {
    return <WrongRole user={user} want={want} />
  }
  if (want !== user.role && window.location.pathname !== ROLE_PATHS[user.role]) {
    window.history.replaceState(null, '', ROLE_PATHS[user.role] + window.location.search)
  }

  return (
    <div className="app">
      <header className={'topbar role-' + user.role}>
        <div className="brand">
          <img className="logo-img" src="/logo.png" alt="" width="38" height="38" />
          <div>
            <b>Mee Bazar <span className="te">మీ బజార్</span></b>
            <small>{user.role === 'admin' ? 'Admin Panel' : user.role === 'owner' ? 'Shop Partner' : user.role === 'delivery' ? 'Delivery Partner' : 'మీ ఊరి షాపులు · ఇంటికే డెలివరీ'}</small>
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
      {user.role === 'delivery' && <Delivery user={user} />}
    </div>
  )
}

const ROLE_NAME = { customer: 'Customer', owner: 'Shop Owner', delivery: 'Delivery Partner', admin: 'Admin' }
function WrongRole({ user, want }) {
  return (
    <div className="auth">
      <div className="auth-hero"><div className="logo-big">🔁</div><h1>Mee Bazar</h1></div>
      <div className="card auth-card center">
        <h2>You are logged in as {ROLE_NAME[user.role]}</h2>
        <p>This link is the <b>{ROLE_NAME[want]}</b> login. To use it, logout first and login with the {ROLE_NAME[want].toLowerCase()} account.</p>
        <button className="btn primary block" onClick={async () => { await logout(); window.location.reload() }}>Logout & open {ROLE_NAME[want]} login</button>
        <button className="btn block" style={{ marginTop: 8 }} onClick={() => { window.location.href = ROLE_PATHS[user.role] }}>Continue as {ROLE_NAME[user.role]}</button>
      </div>
    </div>
  )
}
