# Mee Bazar — Real (production) version roadmap

Goal: a real marketplace that works across everyone's phones, ready to
publish later on Play Store / App Store.

## Already in the app today (works, but data stays in one browser)

| Area | Features |
|---|---|
| Customer | 8 categories, shops sorted by distance, search, one-shop cart, COD + UPI QR, order tracking steps, WhatsApp alert to shop, cancel, profile |
| Shop owner | Register shop, accept/reject, status updates, add/edit/delete products, stock on/off, shop open/close, earnings, UPI ID, new-order sound |
| Admin | First-run admin setup, approve/block shops, block users, all orders, delivery fee / free delivery / commission settings |

Problem: everything is saved in `localStorage`, so a customer's order never
reaches the shop owner's phone, and passwords are stored in plain text.
**Phase 1 fixes this.**

## What we kept, improved or changed from the plan

| Your plan | What we're doing | Why |
|---|---|---|
| Supabase + Row Level Security | ✅ Done in `supabase/schema.sql`, tested | Every table is locked down per role |
| All business categories | ✅ 24 categories in 5 groups (Retail & Fashion, Food, Home & Hardware, Health, Services) | Admin can add more later |
| Admin creates categories + KYC verification | ✅ Category table + KYC fields (GST, FSSAI, drug licence, trade licence, document upload) | Only admin can approve / verify |
| Shop ON/OFF → "Closed today" | ✅ `is_open` + custom `closed_message` | |
| Price confirmation on owner login | 🔄 Changed to **once per day**, not every login | Asking every login annoys owners; `prices_confirmed_at` tracks it |
| Reviews & star ratings | ✅ One review per delivered order, shop rating auto-updates | Stops fake reviews |
| Promo codes | ✅ Flat / percent, min order, max discount, expiry, shop-specific | `WELCOME50` created |
| Substitutions for out-of-stock | ✅ `allow_substitutes` on each order | |
| Product photos | ✅ Storage bucket `product-images` | KYC docs go to a **private** bucket |
| Delivery partner module | ✅ Database ready: approval, online/offline, live location, earnings | UI in Phase 2 |
| Live route map | 🔄 **OpenStreetMap (free)** + "Navigate" button that opens Google Maps app | Google Maps API needs billing |
| In-app calling | 🔄 Normal phone call button (`tel:`), number masking later (Exotel) | Real in-app VoIP is costly and complex |
| In-app chat | ✅ `messages` table with real-time updates, per order | |
| Admin reports | ✅ `admin_report()`: orders, GMV, commission, avg delivery time, COD vs online, pending KYC, open tickets | |
| User problem resolution | ✅ `support_tickets` table | |
| Razorpay + webhooks | ⏳ Phase 4 (see `docs/RAZORPAY_SETUP.md`) | Needs your Razorpay KYC first |

### Extra improvements added
- **Prices are calculated on the server** (`place_order`), so nobody can edit
  prices or mark an order "paid" from the browser.
- Order codes like `MB1001`, full status history with time and who changed it.
- Delivery partner gets a fixed pay per order (admin setting).
- COD orders are marked paid automatically when the rider delivers.
- Delivery radius per shop.
- Nobody can make themselves admin; the first person to set up becomes admin.

## Phases

| Phase | What | Status |
|---|---|---|
| 1 | Supabase database + security (schema, seed data) | ✅ Built & tested — you run it in Supabase |
| 1b | Connect the website to Supabase (real logins, orders sync across phones) | ⏳ Next, after you send the Project URL + anon key |
| 2 | Delivery partner app screens (orders, map, navigate, earnings, call, chat) | ⏳ |
| 3 | Customer upgrades (location pin, banners, reviews, promo, photos, live rider map) + Owner upgrades (daily price check, photo upload, KYC form) + Admin (categories, KYC review, reports, tickets) | ⏳ |
| 4 | Razorpay online payments + webhook | ⏳ needs your Razorpay account |
| 5 | Legal pages (Privacy, Terms, Refund, Delivery, Contact) — **required by Razorpay & Play Store** | ⏳ |
| 6 | Mobile apps: Android (Play Store) first, iOS later; push notifications | ⏳ |
