import { useSyncExternalStore } from 'react'

// Cart lives on the customer's phone (one shop at a time, like Swiggy)
const KEY = 'mb_cart_v2'
const listeners = new Set()
let cart = read()
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
function write(c) {
  cart = c
  try { c ? localStorage.setItem(KEY, JSON.stringify(c)) : localStorage.removeItem(KEY) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
export const useCart = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => cart)
export const clearCart = () => write(null)
export const qtyIn = (c, pid) => c?.items.find((x) => x.id === pid)?.qty || 0

export function addToCart(p, delta, shopName) {
  let c = cart
  if (!c || c.shopId !== p.shop_id) {
    if (c && c.items.length && delta > 0 && !confirm(`Your cart has items from ${c.shopName}. Clear it and add from ${shopName}?`)) return
    c = { shopId: p.shop_id, shopName, items: [] }
  }
  const items = [...c.items]
  const i = items.findIndex((x) => x.id === p.id)
  if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + delta }
  else if (delta > 0) items.push({ id: p.id, name: p.name, price: Number(p.price), mrp: Number(p.mrp || p.price), unit: p.unit, photo_url: p.photo_url, emoji: p.emoji, qty: 1 })
  const clean = items.filter((x) => x.qty > 0)
  write(clean.length ? { ...c, items: clean } : null)
}
export const cartCount = (c) => (c ? c.items.reduce((s, x) => s + x.qty, 0) : 0)
export const cartSubtotal = (c) => (c ? c.items.reduce((s, x) => s + x.price * x.qty, 0) : 0)
