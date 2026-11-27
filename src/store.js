import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Data layer backed by Supabase (real database, shared by every phone).
// Pages read a cached snapshot through useStore(); every write goes to
// Supabase, and real-time updates refresh the cache for everyone.

// Fallback list so the login screen has icons before the database answers.
// The real list (admin can add more) is loaded from the `categories` table.
export let CATEGORIES = [
  { id: 'grocery', name: 'Groceries / Kirana', te: 'కిరాణా', icon: '🛒', color: '#e8f5e9' },
  { id: 'medical', name: 'Medical Shops', te: 'మెడికల్', icon: '💊', color: '#e3f2fd' },
  { id: 'bakery', name: 'Bakery', te: 'బేకరీ', icon: '🎂', color: '#fff3e0' },
  { id: 'electrical', name: 'Electrical', te: 'ఎలక్ట్రికల్', icon: '💡', color: '#fffde7' },
  { id: 'stationery', name: 'Stationery', te: 'స్టేషనరీ', icon: '✏️', color: '#f3e5f5' },
  { id: 'fruits', name: 'Fruits & Veg', te: 'పండ్లు & కూరగాయలు', icon: '🍎', color: '#fce4ec' },
  { id: 'restaurant', name: 'Restaurants', te: 'హోటల్స్', icon: '🍛', color: '#ffebee' },
  { id: 'dairy', name: 'Dairy & Milk', te: 'పాలు', icon: '🥛', color: '#e0f7fa' },
]

export const ORDER_STEPS = ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered']
export const STATUS_LABEL = {
  placed: 'Order Placed',
  accepted: 'Accepted by Shop',
  packed: 'Packed / Ready',
  picked_up: 'Picked up by Rider',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected by Shop',
}

const CART_KEY = 'manabazar_cart_v2'

// ---------- mapping database rows → the shape the pages use ----------
const num = (v) => (v == null ? v : Number(v))
function mapShop(r) {
  return {
    id: r.id, ownerId: r.owner_id, name: r.name, category: r.category_id, address: r.address,
    icon: r.icon, open: r.is_open, closedMessage: r.closed_message, status: r.status,
    kycStatus: r.kyc_status, rating: r.rating_count ? Number(r.rating_avg).toFixed(1) : 'New',
    ratingCount: r.rating_count, eta: r.eta_minutes, minOrder: num(r.min_order), phone: r.phone,
    upiId: r.upi_id, lat: r.lat, lng: r.lng, isSample: r.is_sample,
  }
}
function mapProduct(r) {
  return {
    id: r.id, shopId: r.shop_id, name: r.name, description: r.description, price: num(r.price),
    mrp: num(r.mrp ?? r.price), unit: r.unit, emoji: r.emoji, imageUrl: r.image_url, inStock: r.in_stock,
    barcode: r.barcode || '',
  }
}
function mapOrder(r) {
  return {
    id: r.id, code: r.code, customerId: r.customer_id, shopId: r.shop_id, partnerId: r.delivery_partner_id,
    items: (r.items || []).map((i) => ({ productId: i.product_id, name: i.name, price: num(i.price), qty: i.qty, unit: i.unit, emoji: i.emoji })),
    itemTotal: num(r.item_total), deliveryFee: num(r.delivery_fee), discount: num(r.discount), total: num(r.total),
    payment: String(r.payment_method || '').toUpperCase(), paymentStatus: r.payment_status,
    address: r.address, note: r.note, status: r.status, createdAt: Date.parse(r.created_at),
    history: (r.history || []).map((h) => ({ status: h.status, at: Date.parse(h.at) })),
  }
}
function mapProfile(r, shops) {
  return {
    id: r.id, role: r.role, name: r.name || '', phone: r.phone, address: r.address, active: r.active,
    shopId: shops.find((s) => s.ownerId === r.id)?.id,
  }
}

// ---------- cached snapshot ----------
const emptyDb = { users: [], shops: [], products: [], orders: [], settings: { deliveryFee: 20, freeDeliveryAbove: 499, commission: 5 } }
let db = emptyDb
let session = { userId: null, cart: loadCart() }
let ready = false
let adminExists = true
let state = { db, session, ready, adminExists }
const listeners = new Set()

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || null } catch { return null }
}
function emit() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(session.cart)) } catch { /* ignore */ }
  state = { db, session, ready, adminExists }
  listeners.forEach((l) => l())
}

export function useStore() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)
}

function fail(error, fallback = 'Something went wrong, please try again') {
  console.error(error)
  if (error?.code === '23505' && /barcode/.test(error.message || '')) return 'Another product in your shop already has this barcode.'
  return (error && error.message) || fallback
}
function report(error) {
  if (error) alert(fail(error))
}

// Load everything this user is allowed to see (RLS filters it on the server).
let loading = null
async function refresh() {
  if (loading) return loading
  loading = (async () => {
    const signedIn = !!session.userId
    const [cats, cfg, shops, products, orders, profiles, adm] = await Promise.all([
      supabase.from('categories').select('*').eq('active', true).order('sort'),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('shops').select('*').order('created_at'),
      supabase.from('products').select('*').order('created_at'),
      signedIn ? supabase.from('orders').select('*').order('created_at', { ascending: false }) : { data: [] },
      signedIn ? supabase.from('profiles').select('*') : { data: [] },
      supabase.rpc('admin_exists'),
    ])
    for (const r of [cats, cfg, shops, products, orders, profiles]) if (r.error) console.error(r.error)
    if (cats.data?.length) {
      CATEGORIES = cats.data.map((c) => ({ id: c.id, name: c.name, te: c.name_te, icon: c.icon, color: c.color, group: c.group_name, kind: c.kind }))
    }
    const mappedShops = (shops.data || []).map(mapShop)
    db = {
      shops: mappedShops,
      products: (products.data || []).map(mapProduct),
      orders: (orders.data || []).map(mapOrder),
      users: (profiles.data || []).map((p) => mapProfile(p, mappedShops)),
      settings: cfg.data
        ? { deliveryFee: num(cfg.data.delivery_fee), freeDeliveryAbove: num(cfg.data.free_delivery_above), commission: num(cfg.data.commission_percent) }
        : emptyDb.settings,
    }
    if (!adm.error) adminExists = !!adm.data
    ready = true
    emit()
  })()
  try { await loading } finally { loading = null }
}

// Real-time: when orders / shops / products change anywhere, reload.
let channel = null
let refreshTimer = null
function scheduleRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(refresh, 300)
}
function subscribe() {
  if (channel) supabase.removeChannel(channel)
  channel = supabase.channel('mana-bazar-live')
  for (const table of ['orders', 'shops', 'products']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh)
  }
  channel.subscribe()
}

if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data }) => {
    session = { ...session, userId: data.session?.user?.id || null }
    refresh(); subscribe()
  })
  supabase.auth.onAuthStateChange((_event, s) => {
    const id = s?.user?.id || null
    if (id !== session.userId) {
      session = { ...session, userId: id }
      emit(); refresh(); subscribe()
    }
  })
  // Phones often sleep the tab; reload fresh data when the user comes back.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRefresh() })
}

// ---------- auth ----------
// Logins use mobile number + password. Supabase Auth needs an email, so we
// build a private one from the number and login type. The same number can
// therefore have a customer login and a shop-owner login.
function loginEmail(id, role) {
  const clean = String(id || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${clean}.${role}@users.manabazar.app`
}
function checkPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length !== 10) return 'Please enter a valid 10-digit mobile number'
  return null
}
function checkPassword(pw) {
  return !pw || pw.length < 6 ? 'Password must be at least 6 characters' : null
}

export async function login(phone, password, role) {
  if (role !== 'admin') { const bad = checkPhone(phone); if (bad) return bad }
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(phone, role), password })
  if (error) return 'Wrong mobile number / password for this login type'
  const { data: prof } = await supabase.from('profiles').select('role, active').eq('id', data.user.id).maybeSingle()
  if (prof && !prof.active) { await supabase.auth.signOut(); return 'Your account is blocked. Contact admin.' }
  if (prof && prof.role !== role) { await supabase.auth.signOut(); return 'This account is not a ' + role + ' account' }
  session = { ...session, userId: data.user.id }
  await refresh()
  return null
}

export async function logout() {
  await supabase.auth.signOut()
  session = { userId: null, cart: null }
  db = { ...emptyDb, shops: db.shops, products: db.products, settings: db.settings }
  emit()
}

async function signUp({ phone, password, role, name, address }) {
  const { data, error } = await supabase.auth.signUp({
    email: loginEmail(phone, role === 'admin' ? 'admin' : role),
    password,
    options: { data: { role: role === 'admin' ? 'customer' : role, name, phone, address } },
  })
  if (error) {
    if (/registered|exists/i.test(error.message)) return { error: 'This number is already registered — please login' }
    return { error: fail(error) }
  }
  if (!data.session) return { error: 'Account created but login is pending email confirmation. Ask admin to turn off "Confirm email" in Supabase.' }
  session = { ...session, userId: data.user.id }
  return { user: data.user }
}

export async function registerCustomer({ name, phone, password, address }) {
  const bad = checkPhone(phone) || checkPassword(password)
  if (bad) return bad
  const r = await signUp({ phone, password, role: 'customer', name, address })
  if (r.error) return r.error
  await refresh()
  return null
}

export async function registerOwner({ name, phone, password, shopName, category, address }) {
  const bad = checkPhone(phone) || checkPassword(password)
  if (bad) return bad
  const r = await signUp({ phone, password, role: 'owner', name, address })
  if (r.error) return r.error
  const cat = CATEGORIES.find((c) => c.id === category)
  const { error } = await supabase.from('shops').insert({
    name: shopName, category_id: category, address, phone, icon: cat?.icon || '🏪',
  })
  if (error) return fail(error)
  await refresh()
  return null
}

export function hasAdmin() { return adminExists }
export async function createFirstAdmin({ username, password }) {
  if (adminExists) return 'An admin account already exists — please log in instead'
  if (!String(username).trim()) return 'Please choose a username'
  const bad = checkPassword(password)
  if (bad) return bad
  const r = await signUp({ phone: username, password, role: 'admin', name: 'Admin' })
  if (r.error) return r.error
  const { data, error } = await supabase.rpc('claim_first_admin')
  if (error) return fail(error)
  if (!data) { await supabase.auth.signOut(); return 'An admin account already exists — please log in instead' }
  await refresh()
  return null
}

export async function updateUser(id, patch) {
  const row = {}
  if ('name' in patch) row.name = patch.name
  if ('address' in patch) row.address = patch.address
  if ('active' in patch) row.active = patch.active
  const { error } = await supabase.from('profiles').update(row).eq('id', id)
  report(error)
  await refresh()
}

// ---------- shops & products ----------
const SHOP_FIELDS = {
  name: 'name', address: 'address', phone: 'phone', icon: 'icon', category: 'category_id', open: 'is_open',
  eta: 'eta_minutes', upiId: 'upi_id', status: 'status', kycStatus: 'kyc_status', closedMessage: 'closed_message',
  minOrder: 'min_order', lat: 'lat', lng: 'lng',
}
export async function updateShop(id, patch) {
  const row = {}
  for (const [k, v] of Object.entries(patch)) if (SHOP_FIELDS[k]) row[SHOP_FIELDS[k]] = v
  if ('upi_id' in row && !row.upi_id) row.upi_id = null
  const { error } = await supabase.from('shops').update(row).eq('id', id)
  report(error)
  await refresh()
}

export async function saveProduct(p) {
  const row = {}
  if ('name' in p) row.name = p.name
  if ('price' in p) row.price = p.price
  if ('mrp' in p) row.mrp = p.mrp
  if ('unit' in p) row.unit = p.unit || '1 pc'
  if ('emoji' in p) row.emoji = p.emoji || '📦'
  if ('inStock' in p) row.in_stock = p.inStock
  if ('barcode' in p) row.barcode = (p.barcode || '').trim() || null
  let error
  if (p.id) {
    row.updated_at = new Date().toISOString()
    ;({ error } = await supabase.from('products').update(row).eq('id', p.id))
  } else {
    ;({ error } = await supabase.from('products').insert({ ...row, shop_id: p.shopId }))
  }
  report(error)
  await refresh()
}
export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  report(error)
  await refresh()
}
export async function updateSettings(patch) {
  const { error } = await supabase.from('settings').update({
    delivery_fee: patch.deliveryFee, free_delivery_above: patch.freeDeliveryAbove, commission_percent: patch.commission,
  }).eq('id', 1)
  report(error)
  await refresh()
}

// ---------- cart (one shop at a time, like Swiggy) ----------
export function addToCart(product, delta) {
  let cart = session.cart
  if (!cart || cart.shopId !== product.shopId) {
    if (cart && cart.items.length && delta > 0 && !confirm('Your cart has items from another shop. Clear it and add this item?')) return
    cart = { shopId: product.shopId, items: [] }
  }
  const items = [...cart.items]
  const i = items.findIndex((x) => x.productId === product.id)
  if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + delta }
  else if (delta > 0) items.push({ productId: product.id, name: product.name, price: product.price, emoji: product.emoji, unit: product.unit, qty: 1 })
  const clean = items.filter((x) => x.qty > 0)
  session = { ...session, cart: clean.length ? { ...cart, items: clean } : null }
  emit()
}
export function cartTotals(cart, settings) {
  const itemTotal = cart ? cart.items.reduce((s, x) => s + x.price * x.qty, 0) : 0
  const deliveryFee = !cart || itemTotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryFee
  return { itemTotal, deliveryFee, total: itemTotal + deliveryFee }
}

// ---------- promo codes ----------
// Preview only — place_order on the server checks the code again and
// calculates the real discount.
export async function availablePromos(shopId) {
  const { data, error } = await supabase.from('promo_codes').select('*').eq('active', true)
  if (error) { console.error(error); return [] }
  const now = Date.now()
  return (data || []).filter((p) => (!p.expires_at || Date.parse(p.expires_at) > now) && (!p.shop_id || p.shop_id === shopId))
}
export async function checkPromo(code, shopId, itemTotal) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return { error: 'Enter a promo code' }
  const promos = await availablePromos(shopId)
  const p = promos.find((x) => x.code === c)
  if (!p) return { error: 'Invalid or expired promo code' }
  const min = num(p.min_order)
  if (itemTotal < min) return { error: `Add items worth ${money(min - itemTotal)} more to use ${c} (minimum ${money(min)})` }
  let d = p.discount_type === 'flat' ? num(p.value) : Math.round((itemTotal * num(p.value)) / 100)
  if (p.max_discount != null) d = Math.min(d, num(p.max_discount))
  d = Math.min(d, itemTotal)
  return { code: c, discount: d, description: p.description }
}

// ---------- reviews ----------
export async function fetchShopReviews(shopId) {
  const { data, error } = await supabase.from('reviews').select('id, rating, comment, created_at')
    .eq('shop_id', shopId).order('created_at', { ascending: false }).limit(20)
  if (error) { console.error(error); return [] }
  return data || []
}
export async function fetchOrderReview(orderId) {
  const { data } = await supabase.from('reviews').select('id, rating, comment').eq('order_id', orderId).maybeSingle()
  return data || null
}
export async function submitReview({ orderId, shopId, rating, comment }) {
  const { error } = await supabase.from('reviews').insert({
    order_id: orderId, shop_id: shopId, customer_id: session.userId, rating, comment: comment?.trim() || null,
  })
  if (error) return { error: error.code === '23505' ? 'You have already reviewed this order.' : fail(error) }
  await refresh()
  return { ok: true }
}

// ---------- passwords ----------
export async function changeMyPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) return { error: 'Password must be at least 6 characters' }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return error ? { error: fail(error) } : { ok: true }
}
export async function adminSetPassword(userId, newPassword) {
  const { error } = await supabase.rpc('admin_set_password', { p_user_id: userId, p_password: newPassword })
  return error ? { error: fail(error) } : { ok: true }
}

// ---------- orders ----------
// The server re-calculates prices, delivery fee and discount, so nobody
// can change the amount from the browser. Returns { id } or { error }.
export async function placeOrder({ address, payment, note, promoCode, lat, lng }) {
  const cart = session.cart
  if (!cart) return { error: 'Cart is empty' }
  const { data, error } = await supabase.rpc('place_order', {
    p_shop_id: cart.shopId,
    p_items: cart.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
    p_address: address,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
    p_payment_method: String(payment).toLowerCase(),
    p_note: note || null,
    p_promo_code: promoCode || null,
  })
  if (error) return { error: fail(error) }
  session = { ...session, cart: null }
  emit()
  await refresh()
  return { id: data.id, code: data.code }
}
export async function setOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  report(error)
  await refresh()
}

// ---------- WhatsApp order alert ----------
// No backend/push server exists yet, so this opens a pre-filled WhatsApp
// chat to the shop's number — the customer's one tap sends the alert.
// Once a real backend exists, swap this for a server-triggered WhatsApp
// Business API call so it sends automatically with no tap needed.
export function toWaNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  return digits
}
export function orderWhatsAppLink(order, shop) {
  const lines = [
    `🛍️ New Mana Bazar order #${order.code || order.id}`,
    ...order.items.map((i) => `• ${i.name} x${i.qty}`),
    `Total: ${money(order.total)} (${order.payment})`,
    `Deliver to: ${order.address}`,
    order.note ? `Note: ${order.note}` : null,
    `Open your Mana Bazar Owner app to accept.`,
  ].filter(Boolean)
  const text = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/${toWaNumber(shop.phone)}?text=${text}`
}

// ---------- UPI QR for checkout ----------
// Builds a standard upi://pay deep link (opens directly in GPay/PhonePe on
// a phone) and a QR image of that same link (for scanning on a laptop,
// or when the buyer is on a different device than their UPI app).
export function upiPayLink({ upiId, payeeName, amount, orderId }) {
  if (!upiId) return null
  const params = new URLSearchParams({
    pa: upiId, pn: payeeName, am: String(amount), cu: 'INR', tn: `Mana Bazar order ${orderId}`,
  })
  return `upi://pay?${params.toString()}`
}
// Link a customer opens by scanning a shop's QR poster.
// Inside the Android app the page runs on https://localhost, so QR links always
// point at the public website (which also opens the app's shop page).
export const SITE_URL = 'https://mana-bazar-rho.vercel.app'
export function shopLink(shopId) {
  const origin = window.location.hostname === 'localhost' ? SITE_URL : window.location.origin
  return `${origin}/?shop=${shopId}`
}

export function upiQrImage(upiLink, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiLink)}`
}

// ---------- distance & delivery time ----------
// Haversine formula — straight-line distance in km between two lat/lng points.
// Real road distance would need a maps/routing API; this is the honest
// approximation a no-backend demo can do on its own.
export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
// Shop's own prep/pack time (shop.eta) plus a simple travel estimate from
// distance (avg ~20 km/h local delivery speed), rounded to a 5-min slot.
export function etaWithDistance(baseEta, km) {
  if (km == null) return { min: baseEta, max: baseEta + 10 }
  const travel = Math.round((km / 20) * 60)
  const min = Math.ceil((baseEta + travel) / 5) * 5
  return { min, max: min + 10 }
}
export function slotLabel(min) {
  const d = new Date(Date.now() + min * 60000)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
export const timeAgo = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + ' min ago'
  const h = Math.round(m / 60)
  if (h < 24) return h + ' hr ago'
  return new Date(t).toLocaleDateString('en-IN')
}
