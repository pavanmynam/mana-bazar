import { createClient } from '@supabase/supabase-js'

// Public project URL + anon key. These are safe to ship in the browser:
// Row Level Security rules in the database decide what each user can do.
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Vercel if
// the project ever changes. NEVER put the service_role key here.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://lnuptsingyembirjzjzr.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudXB0c2luZ3llbWJpcmp6anpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3Njg2NDYsImV4cCI6MjExMTM0NDY0Nn0.skZIPHW5wJ8DSOX2BojIpqAI1UOKwpY4t-4zHFrQw5I'

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
