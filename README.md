# 🛍️ Mana Bazar – మన ఊరి అన్ని షాపులు ఒకే యాప్ లో

Zepto / Swiggy style **multi-shop delivery app** for local towns: Grocery & Kirana, Fruits & Veg, Dairy, Medical, Bakery,
Restaurants, Meat & Fish, Electricals, Stationery, Home & Kitchen – all in one app.

Live: https://mana-bazar-rho.vercel.app

## 4 Logins

| Role | Features |
|---|---|
| 🧑 **Customer** | Set location on map (GPS / search) → only **nearby shops** (radius set by admin). Zepto-style home, categories, sub-categories, best deals, search, shop page with side menu, wishlist ❤️, cart, COD / UPI pay, live order tracking, delivery OTP, ratings & reviews |
| 🏪 **Shop Owner** | Register shop → add **shop photo, map location, timings, UPI, bank, GST / licence**. Add products with **photos**, stock on/off, open/close shop, new-order sound 🔔, accept → pack → deliver, earnings after commission |
| 🛵 **Delivery Partner** | Register → admin approves. Go online, see packed orders near you, accept, Google Maps directions, call shop / customer, deliver with customer **OTP**, earnings + COD cash |
| 🛡️ **Admin** | Approve shops / products / delivery partners, **add & edit any shop and product** (photos, bank details, link owner), block users, see all customers & orders, change any order status, set delivery fee, free-delivery limit, commission %, rider pay, radius, auto-approve |

## Setup (one time)

1. Create a free project on **supabase.com** (region: Mumbai).
2. Supabase → **SQL Editor** → paste all of [`supabase/setup.sql`](supabase/setup.sql) → **Run**. (Creates tables, security rules, photo storage and 10 demo shops in Guntur.)
3. Supabase → **Authentication → Sign In / Providers → Email** → turn **OFF "Confirm email"**. (Login is mobile number + password.)
4. Put keys in `.env` (local) and Vercel → Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. Open the app → **Admin** tab → "Create admin account" (only the first person can do this).

## Run locally
```bash
npm install
npm run dev
```

## Tech
React 19 + Vite · Supabase (Postgres, Auth, Storage, Realtime) · Leaflet + OpenStreetMap maps.
All money / status rules run inside the database (`place_order`, `update_order_status`, `rate_order`) with Row Level Security, so customers can't change prices or approve themselves.
