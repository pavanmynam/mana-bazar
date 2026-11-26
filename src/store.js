import { useSyncExternalStore } from 'react'

// Simple data layer backed by localStorage.
// All reads/writes go through this file, so it can later be swapped for a real backend (Supabase / Firebase).

const KEY = 'manabazar_db_v1'
const SESSION = 'manabazar_session_v1'

export const CATEGORIES = [
  { id: 'grocery', name: 'Groceries', te: 'కిరాణా', icon: '🛒', color: '#e8f5e9' },
  { id: 'medical', name: 'Medical', te: 'మెడికల్', icon: '💊', color: '#e3f2fd' },
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
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected by Shop',
}

const uid = (p) => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)

function seed() {
  // No hardcoded admin or customer account — the first person to open the
  // Admin tab creates the real admin login (see createFirstAdmin below), and
  // customers create their own account from the login screen's "Create
  // account" link. The sample shops below are real catalog/demo content for
  // showing the app to prospective shop owners, not login credentials, so
  // their owner accounts stay (a real person can still log into a sample
  // shop to show the accept-order flow) — they're just no longer advertised
  // on the login screen as a "demo" shortcut.
  const users = []
  // Guntur city center, used as the anchor point for seeded shop coordinates.
  const CENTER = { lat: 16.3067, lng: 80.4365 }
  const shopsSeed = [
    ['Sri Lakshmi Kirana', 'grocery', 'Brodipet, Guntur', '🛒', 0.004, -0.006, [
      ['Sona Masoori Rice', 1450, 1600, '25 kg', '🍚'], ['Toor Dal', 165, 180, '1 kg', '🫘'], ['Sunflower Oil', 145, 160, '1 L', '🛢️'],
      ['Sugar', 48, 52, '1 kg', '🧂'], ['Tata Salt', 28, 30, '1 kg', '🧂'], ['Red Chilli Powder', 90, 110, '250 g', '🌶️'], ['Tea Powder', 140, 155, '250 g', '🍵']]],
    ['Apollo Medicals', 'medical', 'Arundelpet, Guntur', '💊', -0.009, 0.011, [
      ['Paracetamol 650', 30, 32, '15 tabs', '💊'], ['Cough Syrup', 110, 125, '100 ml', '🧴'], ['Band-Aid', 50, 55, '20 pcs', '🩹'],
      ['Digital Thermometer', 199, 299, '1 pc', '🌡️'], ['ORS Sachet', 22, 25, '1 pc', '🥤'], ['Face Masks', 99, 150, '10 pcs', '😷']]],
    ['Karachi Bakery Point', 'bakery', 'Lakshmipuram, Guntur', '🎂', 0.015, 0.003, [
      ['Black Forest Cake', 450, 500, '500 g', '🎂'], ['Veg Puff', 20, 25, '1 pc', '🥟'], ['Osmania Biscuits', 120, 140, '400 g', '🍪'],
      ['Fruit Bread', 45, 50, '1 pack', '🍞'], ['Chocolate Pastry', 60, 70, '1 pc', '🍰'], ['Dil Kush', 30, 35, '1 pc', '🥐']]],
    ['Venkateswara Electricals', 'electrical', 'Kothapet, Guntur', '💡', -0.018, -0.014, [
      ['LED Bulb 9W', 99, 150, '1 pc', '💡'], ['Extension Board', 349, 450, '4 socket', '🔌'], ['Ceiling Fan', 1899, 2500, '1 pc', '🌀'],
      ['Wire 1.5mm', 1250, 1500, '90 m', '🧵'], ['AA Batteries', 80, 100, '4 pcs', '🔋'], ['Tube Light 20W', 249, 320, '1 pc', '💡']]],
    ['Vidya Stationery', 'stationery', 'Near Govt School, Guntur', '✏️', 0.021, -0.009, [
      ['Long Notebook', 45, 50, '200 pages', '📓'], ['Ball Pens', 50, 60, '10 pcs', '🖊️'], ['Geometry Box', 120, 150, '1 set', '📐'],
      ['A4 Paper Rim', 280, 320, '500 sheets', '📄'], ['Color Pencils', 90, 110, '24 pcs', '🖍️'], ['School Bag', 650, 899, '1 pc', '🎒']]],
    ['Fresh Fruits & Veggies', 'fruits', 'Rythu Bazar, Guntur', '🍎', -0.006, 0.019, [
      ['Banana', 50, 60, '1 dozen', '🍌'], ['Apple', 180, 220, '1 kg', '🍎'], ['Tomato', 30, 40, '1 kg', '🍅'],
      ['Onion', 40, 45, '1 kg', '🧅'], ['Mango (Banganapalli)', 120, 150, '1 kg', '🥭'], ['Green Chilli', 20, 25, '250 g', '🌶️']]],
    ['Annapurna Tiffins', 'restaurant', 'Pattabhipuram, Guntur', '🍛', 0.009, 0.024, [
      ['Idli (4 pcs)', 40, 45, '1 plate', '🍘'], ['Masala Dosa', 60, 70, '1 plate', '🫓'], ['Veg Meals', 120, 140, '1 plate', '🍛'],
      ['Chicken Biryani', 220, 250, '1 plate', '🍗'], ['Pesarattu', 55, 60, '1 plate', '🫓'], ['Filter Coffee', 25, 30, '1 cup', '☕']]],
    ['Heritage Milk Point', 'dairy', 'Brindavan Gardens, Guntur', '🥛', -0.002, -0.021, [
      ['Toned Milk', 30, 30, '500 ml', '🥛'], ['Curd', 35, 38, '500 g', '🥣'], ['Paneer', 95, 110, '200 g', '🧀'],
      ['Ghee', 330, 360, '500 ml', '🧈'], ['Butter Milk', 15, 15, '200 ml', '🥤']]],
  ]
  const shops = []
  const products = []
  shopsSeed.forEach(([name, category, address, icon, dLat, dLng, items], i) => {
    const ownerId = 'u_owner' + i
    const shopId = 's' + i
    users.push({
      id: ownerId, role: 'owner', name: name + ' Owner', phone: i === 0 ? '8888888888' : '80000000' + String(i).padStart(2, '0'),
      password: '1234', shopId, active: true,
    })
    shops.push({
      id: shopId, ownerId, name, category, address, icon, open: true, status: 'approved',
      rating: (4 + (i % 9) / 10).toFixed(1), eta: 20 + (i % 4) * 5, minOrder: 0, phone: '98480' + String(10000 + i * 111),
      lat: CENTER.lat + dLat, lng: CENTER.lng + dLng,
    })
    items.forEach(([pname, price, mrp, unit, emoji], j) => {
      products.push({ id: `p${i}_${j}`, shopId, name: pname, price, mrp, unit, emoji, inStock: true })
    })
  })
  // one pending shop so admin approval flow can be seen
  users.push({ id: 'u_owner_new', role: 'owner', name: 'Suresh', phone: '7777777777', password: '1234', shopId: 's_new', active: true })
  shops.push({ id: 's_new', ownerId: 'u_owner_new', name: 'Suresh General Stores', category: 'grocery', address: 'Nallapadu, Guntur', icon: '🏪', open: true, status: 'pending', rating: '4.0', eta: 30, minOrder: 0, phone: '7777777777', lat: CENTER.lat - 0.03, lng: CENTER.lng + 0.01 })

  // No seeded order — there's no seeded customer to own one anymore.
  // Real orders appear here once a real customer registers and orders.
  const orders = []
  return { users, shops, products, orders, settings: { deliveryFee: 20, freeDeliveryAbove: 499, commission: 5 }, orderSeq: 1000 }
}

let db = load()
let session = loadSession()
const listeners = new Set()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  const s = seed()
  persist(s)
  return s
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION)) || { userId: null, cart: null } } catch { return { userId: null, cart: null } }
}
function persist(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* ignore */ }
}
function emit() {
  persist(db)
  try { localStorage.setItem(SESSION, JSON.stringify(session)) } catch { /* ignore */ }
  state = { db, session }
  listeners.forEach((l) => l())
}
let state = { db, session }

// sync across tabs (e.g. customer in one tab, shop owner in another)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === SESSION) {
      db = load(); session = loadSession(); state = { db, session }
      listeners.forEach((l) => l())
    }
  })
}

export function useStore() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)
}

// ---------- auth ----------
export function login(phone, password, role) {
  const u = db.users.find((x) => x.phone === phone.trim() && x.password === password && x.role === role)
  if (!u) return 'Wrong phone / password for this login type'
  if (!u.active) return 'Your account is blocked. Contact admin.'
  session = { ...session, userId: u.id }
  emit()
  return null
}
export function logout() { session = { userId: null, cart: null }; emit() }

export function registerCustomer({ name, phone, password, address }) {
  if (db.users.some((u) => u.phone === phone && u.role === 'customer')) return 'Phone already registered'
  const u = { id: uid('u_'), role: 'customer', name, phone, password, address, active: true }
  db = { ...db, users: [...db.users, u] }
  session = { ...session, userId: u.id }
  emit(); return null
}
export function registerOwner({ name, phone, password, shopName, category, address }) {
  if (db.users.some((u) => u.phone === phone && u.role === 'owner')) return 'Phone already registered'
  const shopId = uid('s_')
  const u = { id: uid('u_'), role: 'owner', name, phone, password, shopId, active: true }
  const cat = CATEGORIES.find((c) => c.id === category)
  const shop = { id: shopId, ownerId: u.id, name: shopName, category, address, icon: cat?.icon || '🏪', open: true, status: 'pending', rating: '4.0', eta: 30, minOrder: 0, phone }
  db = { ...db, users: [...db.users, u], shops: [...db.shops, shop] }
  session = { ...session, userId: u.id }
  emit(); return null
}
export function updateUser(id, patch) {
  db = { ...db, users: db.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }; emit()
}

// ---------- admin: one-time setup, no hardcoded account ----------
export function hasAdmin() { return db.users.some((u) => u.role === 'admin') }
export function createFirstAdmin({ username, password }) {
  if (hasAdmin()) return 'An admin account already exists — please log in instead'
  if (!username.trim() || !password.trim()) return 'Please fill both fields'
  const u = { id: uid('u_'), role: 'admin', name: 'Admin', phone: username.trim(), password, active: true }
  db = { ...db, users: [...db.users, u] }
  session = { ...session, userId: u.id }
  emit(); return null
}

// ---------- shops & products ----------
export function updateShop(id, patch) {
  db = { ...db, shops: db.shops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }; emit()
}
export function saveProduct(p) {
  if (p.id) db = { ...db, products: db.products.map((x) => (x.id === p.id ? { ...x, ...p } : x)) }
  else db = { ...db, products: [...db.products, { ...p, id: uid('p_'), inStock: true }] }
  emit()
}
export function deleteProduct(id) { db = { ...db, products: db.products.filter((p) => p.id !== id) }; emit() }
export function updateSettings(patch) { db = { ...db, settings: { ...db.settings, ...patch } }; emit() }

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

// ---------- orders ----------
export function placeOrder({ address, payment, note }) {
  const cart = session.cart
  if (!cart) return null
  const t = cartTotals(cart, db.settings)
  const seq = db.orderSeq + 1
  const order = {
    id: 'MB' + seq, customerId: session.userId, shopId: cart.shopId, items: cart.items,
    ...t, payment, address, note, status: 'placed', createdAt: Date.now(), history: [{ status: 'placed', at: Date.now() }],
  }
  db = { ...db, orderSeq: seq, orders: [order, ...db.orders] }
  session = { ...session, cart: null }
  emit()
  return order.id
}
export function setOrderStatus(id, status) {
  db = {
    ...db,
    orders: db.orders.map((o) => (o.id === id ? { ...o, status, history: [...o.history, { status, at: Date.now() }] } : o)),
  }
  emit()
}

export function resetDemo() {
  localStorage.removeItem(KEY); localStorage.removeItem(SESSION)
  db = seed(); session = { userId: null, cart: null }; emit()
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
    `🛍️ New Mana Bazar order #${order.id}`,
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
