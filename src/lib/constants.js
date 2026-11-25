export const CATEGORIES = [
  { id: 'grocery', name: 'Grocery & Kirana', short: 'Grocery', icon: '🛒', color: '#e8f5e9',
    subs: ['Atta, Rice & Dal', 'Oil, Ghee & Masala', 'Dairy, Bread & Eggs', 'Snacks & Biscuits', 'Tea, Coffee & Drinks', 'Personal Care', 'Cleaning Essentials', 'Fruits & Vegetables'] },
  { id: 'fruits', name: 'Fruits & Vegetables', short: 'Fruits & Veg', icon: '🍎', color: '#fce4ec',
    subs: ['Fresh Fruits', 'Fresh Vegetables', 'Leafy & Herbs', 'Exotic'] },
  { id: 'dairy', name: 'Dairy & Milk', short: 'Dairy', icon: '🥛', color: '#e0f7fa',
    subs: ['Milk', 'Curd & Buttermilk', 'Paneer & Cheese', 'Butter & Ghee', 'Sweets'] },
  { id: 'medical', name: 'Medical & Pharmacy', short: 'Medical', icon: '💊', color: '#e3f2fd',
    subs: ['Medicines', 'Health Devices', 'First Aid', 'Baby Care', 'Personal Care'] },
  { id: 'bakery', name: 'Bakery & Sweets', short: 'Bakery', icon: '🎂', color: '#fff3e0',
    subs: ['Cakes', 'Breads', 'Biscuits & Cookies', 'Snacks & Puffs', 'Sweets'] },
  { id: 'restaurant', name: 'Restaurants & Tiffins', short: 'Food', icon: '🍛', color: '#ffebee',
    subs: ['Tiffins', 'Meals', 'Biryani', 'Snacks', 'Beverages'] },
  { id: 'meat', name: 'Meat, Fish & Eggs', short: 'Meat & Fish', icon: '🍗', color: '#fbe9e7',
    subs: ['Chicken', 'Mutton', 'Fish & Seafood', 'Eggs'] },
  { id: 'electrical', name: 'Electricals', short: 'Electrical', icon: '💡', color: '#fffde7',
    subs: ['Lights', 'Fans', 'Wires & Switches', 'Batteries', 'Appliances'] },
  { id: 'stationery', name: 'Stationery & Books', short: 'Stationery', icon: '✏️', color: '#f3e5f5',
    subs: ['Notebooks', 'Pens & Pencils', 'Art & Craft', 'Office Supplies', 'School Bags'] },
  { id: 'home', name: 'Home & Kitchen', short: 'Home', icon: '🏠', color: '#ede7f6',
    subs: ['Kitchenware', 'Cleaning', 'Plastic Items', 'Pooja Items'] },
]
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || { id, name: id, short: id, icon: '🏪', color: '#f1f1f1', subs: [] }

export const ORDER_STEPS = ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered']
export const STATUS_LABEL = {
  placed: 'Order Placed', accepted: 'Accepted', packed: 'Packed', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled', rejected: 'Rejected',
}
export const ACTIVE = ['placed', 'accepted', 'packed', 'out_for_delivery']

export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const timeAgo = (t) => {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + ' min ago'
  const h = Math.round(m / 60)
  if (h < 24) return h + ' hr ago'
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
export function distanceKm(a, b) {
  if (!a?.lat || !b?.lat) return null
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
export const kmText = (d) => (d == null ? '' : d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`)
export const mapsLink = (lat, lng, text) =>
  lat ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text || '')}`
