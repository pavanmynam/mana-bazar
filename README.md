# Mana Bazar REAL MODE - FULL PROPER CODE

## Check chesina tarvatha fix chesam - Ippudu FULL code undhi
Files:
- src/App.jsx - FULL APP: 4 Roles, 4 Delivery Modes, Shop Add, Product Add with Image URL, Cart, Checkout, Admin, Delivery Boy, Subscription, Theme
- src/supabaseClient.js - Real Supabase connection
- supabase/schema.sql - 6 Tables: profiles, shops, products, delivery_boys, orders, subscriptions
- index.html, src/main.jsx, src/index.css

## Run
1. npm install
2. .env lo VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY pettu (supabase.com -> New Project)
3. Supabase SQL Editor lo supabase/schema.sql run chey
4. npm run dev

## Features Covered
Customer: Categories 10, Near Shops by Area, Products, Cart, 4 Delivery Modes, Payment UPI/COD/Direct Shop UPI
Shop Owner: Shop Add Full Form, Product Add Photo+Price+Details, Own Delivery Boys Add, Subscription PRO/PREMIUM
Delivery Boy: App Boy / Shop Boy, Online/Offline, Accept Order, OTP Deliver
Admin: Approve Shops/Products/Boys, Control All, Subscription + Commission
