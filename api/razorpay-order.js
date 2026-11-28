// POST { orderId } (logged-in customer) -> creates a Razorpay order for an
// unpaid Mee Bazar order. The amount always comes from our database.
import { currentUser, db, env, json, paymentsReady, preflight, razorpay } from './_lib/server.js'

export function OPTIONS() { return preflight() }
export async function POST(request) {
  if (!paymentsReady()) return json({ error: 'Online payment is not set up yet' }, 503)
  try {
    const user = await currentUser(request)
    if (!user) return json({ error: 'Please login again' }, 401)
    const { orderId } = await request.json()
    const [order] = await db(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,code,customer_id,total,payment_method,payment_status,status,razorpay_order_id`)
    if (!order || order.customer_id !== user.id) return json({ error: 'Order not found' }, 404)
    if (order.payment_method !== 'razorpay') return json({ error: 'This order is not an online payment order' }, 400)
    if (order.payment_status === 'paid') return json({ error: 'Already paid' }, 409)
    if (['cancelled', 'rejected'].includes(order.status)) return json({ error: 'This order was cancelled' }, 409)

    const amount = Math.round(Number(order.total) * 100) // paise
    let rzpId = order.razorpay_order_id
    if (rzpId) {
      const existing = await razorpay(`orders/${rzpId}`).catch(() => null)
      if (!existing || existing.amount !== amount || existing.status === 'paid') rzpId = null
    }
    if (!rzpId) {
      const rzp = await razorpay('orders', { amount, currency: 'INR', receipt: order.code, notes: { order_id: order.id, code: order.code } })
      rzpId = rzp.id
      await db(`orders?id=eq.${order.id}`, { method: 'PATCH', body: { razorpay_order_id: rzpId } })
    }
    const [profile] = await db(`profiles?id=eq.${user.id}&select=name,phone`)
    return json({ keyId: env.keyId, razorpayOrderId: rzpId, amount, code: order.code, name: profile?.name || '', phone: profile?.phone || '' })
  } catch (e) {
    console.error(e)
    return json({ error: 'Could not start payment, please try again' }, 500)
  }
}
