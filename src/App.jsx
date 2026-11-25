import { useStore, logout } from './store'
import Auth from './pages/Auth'
import Customer from './pages/Customer'
import Owner from './pages/Owner'
import Admin from './pages/Admin'

export default function App() {
  const { db, session } = useStore()
  const user = db.users.find((u) => u.id === session.userId)

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
    </div>
  )
}
