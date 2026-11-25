import { configured } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/auth'
import Auth from './pages/Auth'
import Customer from './pages/Customer'
import Owner from './pages/Owner'
import Delivery from './pages/Delivery'
import Admin from './pages/Admin'
import { Loading } from './components/ui'

export default function App() {
  if (!configured) return <NotConfigured />
  return <AuthProvider><Shell /></AuthProvider>
}

function Shell() {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <Loading />
  if (!session || !profile) return <Auth />
  if (profile.status === 'blocked') {
    return (
      <div className="center-page">
        <div className="card center"><div className="empty-ico">⛔</div><h2>Account blocked</h2><p>Please contact Mana Bazar support.</p>
          <button className="btn ghost" onClick={signOut}>Logout</button></div>
      </div>
    )
  }
  if (profile.role === 'owner') return <Owner />
  if (profile.role === 'delivery') return <Delivery />
  if (profile.role === 'admin') return <Admin />
  return <Customer />
}

function NotConfigured() {
  return (
    <div className="center-page">
      <div className="card">
        <h2>🛍️ Mana Bazar – setup needed</h2>
        <p>Supabase keys are missing. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> (local) or Vercel → Settings → Environment Variables, then redeploy.</p>
      </div>
    </div>
  )
}
