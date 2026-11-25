import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null

// Phone + password login. Supabase needs an email, so we build a private one from phone + role.
export const phoneEmail = (phone, role) => `${phone.replace(/\D/g, '')}.${role}@manabazar.app`

export function errMsg(e) {
  const m = e?.message || String(e)
  if (m.includes('Invalid login credentials')) return 'Wrong mobile number or password'
  if (m.includes('already registered')) return 'This mobile number is already registered. Please login.'
  if (m.includes('Password should be')) return 'Password must be at least 6 characters'
  if (m.includes('Email not confirmed')) return 'Account not confirmed. Admin: turn off "Confirm email" in Supabase Auth settings.'
  return m.replace(/^.*?ERROR:\s*/, '')
}

export async function uploadPhoto(file, userId) {
  if (!file) return ''
  const small = await shrinkImage(file, 900)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, small, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
}

// resize big phone photos before upload (saves data + storage)
function shrinkImage(file, max) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.82)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}
