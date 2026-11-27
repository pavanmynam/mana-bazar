# 🛍️ Mana Bazar

**All local shops in one app** – like Swiggy / Zomato, but for every kind of shop:
Groceries, Medical, Bakery, Electrical, Stationery, Fruits & Vegetables, Restaurants and Dairy.

## 3 Logins — real accounts only, no demo credentials

| Role | What they can do | How to get in |
|---|---|---|
| 🧑 **Customer** | Browse shops by category/distance, search products, add to cart, place order (COD / UPI), track order live, notify shop on WhatsApp, cancel | Register from the login screen |
| 🏪 **Shop Owner** | Register shop, accept/reject orders, update status (Accepted → Packed → Out for delivery → Delivered), add/edit/delete products, set UPI ID, stock on/off, shop open/close, earnings | Register from the login screen (shop needs Admin approval before it's visible to customers) |
| 🛡️ **Admin** | Dashboard (sales, commission), approve/block shops, block users, see all orders, set delivery fee / free-delivery limit / commission % | First person to open the **Admin** tab sets their own username & password — there is no hardcoded admin account |

The app still ships with a **sample catalog** of 8 shops (grocery, medical, bakery, etc.) with real-looking products, so the app isn't empty on first open and you have something to show prospective shop owners. These are content, not login shortcuts — nobody needs to "log in as a demo shop owner" to use the app; register your own account for that. Use **"Reset to sample catalog"** on the login screen to wipe all real data and start over from just the sample catalog, if you're still testing.

## 🚀 Going live (real version)
- Roadmap & what's built: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Database setup (Supabase): [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) — runs [`supabase/schema.sql`](supabase/schema.sql) + [`supabase/seed.sql`](supabase/seed.sql)
- Payments (Razorpay): [`docs/RAZORPAY_SETUP.md`](docs/RAZORPAY_SETUP.md)

## Run locally
```bash
npm install
npm run dev
```

## Tech
React 19 + Vite. Data is stored in the browser (`localStorage`) through `src/store.js` – open the customer and shop owner in two tabs of the same browser to see orders update live.
To make it work across different phones, replace `src/store.js` with a real backend (Supabase / Firebase).
