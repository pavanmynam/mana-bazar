// Shared helpers for the Razorpay server functions (run on Vercel, never in the browser).
// Secrets come only from Vercel -> Settings -> Environment Variables.
import crypto from 'node:crypto'

export const env = {
  get supabaseUrl() { return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lnuptsingyembirjzjzr.supabase.co' },
  get serviceKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY || '' },
  get keyId() { return process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '' },
  get keySecret() { return process.env.RAZORPAY_KEY_SECRET || '' },
  get webhookSecret() { return process.env.RAZORPAY_WEBHOOK_SECRET || '' },
}
export const paymentsReady = () => Boolean(env.serviceKey && env.keyId && env.keySecret)

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
}
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } })
}
export const preflight = () => new Response(null, { status: 204, headers: CORS })

// Supabase REST as the server (service role bypasses row security — use carefully).
export async function db(path, { method = 'GET', body } = {}) {
  const r = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.serviceKey, authorization: `Bearer ${env.serviceKey}`,
      'content-type': 'application/json', prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`db ${r.status}: ${JSON.stringify(data)}`)
  return data
}

// Who is calling? Checks the user's Supabase login token.
export async function currentUser(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const r = await fetch(`${env.supabaseUrl}/auth/v1/user`, { headers: { apikey: env.serviceKey, authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  return r.json()
}

export function hmac(secret, text) {
  return crypto.createHmac('sha256', secret).update(text).digest('hex')
}
export function sameSig(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export async function razorpay(path, body) {
  const auth = Buffer.from(`${env.keyId}:${env.keySecret}`).toString('base64')
  const r = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`razorpay ${r.status}: ${data?.error?.description || 'error'}`)
  return data
}

export async function markPaid(orderId, paymentId) {
  const rows = await db(`orders?id=eq.${orderId}&payment_status=neq.paid`, {
    method: 'PATCH', body: { payment_status: 'paid', razorpay_payment_id: paymentId },
  })
  return rows?.[0] || null
}
