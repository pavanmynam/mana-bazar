// POST { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Called by the app right after checkout. Marks the order paid only if
// Razorpay's signature is genuine. (The webhook does the same as a backup.)
import { db, env, hmac, json, markPaid, paymentsReady, preflight, sameSig } from './_lib/server.js'

export function OPTIONS() { return preflight() }
export async function POST(request) {
  if (!paymentsReady()) return json({ error: 'Online payment is not set up yet' }, 503)
  try {
    const b = await request.json()
    const expected = hmac(env.keySecret, `${b.razorpay_order_id}|${b.razorpay_payment_id}`)
    if (!sameSig(expected, b.razorpay_signature)) return json({ error: 'Payment could not be verified' }, 400)
    const [order] = await db(`orders?id=eq.${encodeURIComponent(b.orderId)}&select=id,razorpay_order_id`)
    if (!order || order.razorpay_order_id !== b.razorpay_order_id) return json({ error: 'Order mismatch' }, 400)
    await markPaid(order.id, b.razorpay_payment_id)
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'Could not confirm payment' }, 500)
  }
}
