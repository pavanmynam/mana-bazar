import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, phoneEmail } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user?.id
  const reloadProfile = useCallback(async () => {
    if (!uid) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data || null)
  }, [uid])

  useEffect(() => { if (session !== undefined) reloadProfile() }, [session, reloadProfile])

  async function signIn(phone, password, role) {
    const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(phone, role), password })
    if (error) throw error
  }
  async function signUp(phone, password, role, meta) {
    const { data, error } = await supabase.auth.signUp({
      email: phoneEmail(phone, role), password,
      options: { data: { ...meta, phone: phone.replace(/\D/g, ''), role } },
    })
    if (error) throw error
    if (!data.session) throw new Error('Email not confirmed')
    return data.user
  }
  async function signOut() { await supabase.auth.signOut(); setProfile(null) }
  async function updateProfile(patch) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
    if (error) throw error
    await reloadProfile()
  }

  return (
    <Ctx.Provider value={{ session, profile, loading: session === undefined || (session && profile === undefined), signIn, signUp, signOut, reloadProfile, updateProfile }}>
      {children}
    </Ctx.Provider>
  )
}
