// Razorpay -> Mana Bazar. Set this URL in Razorpay Dashboard -> Webhooks:
//   https://mana-bazar-rho.vercel.app/api/razorpay-webhook
// Events: payment.captured, order.paid, payment.failed
import { db, env, hmac, json, markPaid, sameSig } from './_lib/server.js'

export async function POST(request) {
  if (!env.webhookSecret || !env.serviceKey) return json({ error: 'not configured' }, 503)
  const raw = await request.text()
  if (!sameSig(hmac(env.webhookSecret, raw), request.headers.get('x-razorpay-signature'))) {
    return json({ error: 'bad signature' }, 400)
  }
  try {
    const evt = JSON.parse(raw)
    const pay = evt.payload?.payment?.entity
    const rzpOrderId = pay?.order_id || evt.payload?.order?.entity?.id
    if (!rzpOrderId) return json({ ok: true })
    const [order] = await db(`orders?razorpay_order_id=eq.${encodeURIComponent(rzpOrderId)}&select=id,payment_status`)
    if (!order) return json({ ok: true })
    if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
      await markPaid(order.id, pay?.id || null)
    } else if (evt.event === 'payment.failed' && order.payment_status === 'pending') {
      // Leave it pending so the customer can try again; nothing to change.
    }
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'error' }, 500) // Razorpay retries on non-2xx
  }
}
