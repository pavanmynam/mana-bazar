# 🛍️ Mana Bazar

**All local shops in one app** – like Swiggy / Zomato, but for every kind of shop:
Groceries, Medical, Bakery, Electrical, Stationery, Fruits & Vegetables, Restaurants and Dairy.

## 3 Logins

| Role | What they can do | Demo login |
|---|---|---|
| 🧑 **Customer** | Browse shops by category, search products, add to cart, place order (COD / UPI), track order live, cancel | `9999999999` / `1234` |
| 🏪 **Shop Owner** | Register shop, accept/reject orders, update status (Accepted → Packed → Out for delivery → Delivered), add/edit/delete products, stock on/off, shop open/close, earnings | `8888888888` / `1234` |
| 🛡️ **Admin** | Dashboard (sales, commission), approve/block shops, block users, see all orders, set delivery fee / free-delivery limit / commission % | `admin` / `admin123` |

New customers and shop owners can register from the login screen. New shops need Admin approval.

## Run locally
```bash
npm install
npm run dev
```

## Tech
React 19 + Vite. Data is stored in the browser (`localStorage`) through `src/store.js` – open the customer and shop owner in two tabs of the same browser to see orders update live.
To make it work across different phones, replace `src/store.js` with a real backend (Supabase / Firebase).
