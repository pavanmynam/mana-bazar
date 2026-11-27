# Supabase setup — step by step (15 min)

Supabase = Mana Bazar database + logins. Free plan tho start cheyyochu.

## Step 1 — Account & project

1. **supabase.com** open chesi **Start your project** click cheyyandi.
2. **Continue with GitHub** select chesi, mee GitHub account tho login avvandi.
3. **New project** click cheyyandi:
   - Name: `mana-bazar`
   - Database Password: **Generate a password** click chesi, aa password
     ni safe ga save cheyyandi (Notes / password manager lo).
   - Region: **South Asia (Mumbai)** — India users ki fast.
   - Plan: **Free**
4. **Create new project** click chesi 1–2 nimishalu wait cheyyandi.

## Step 2 — Database tables create cheyyandi

1. Left side menu lo **SQL Editor** click cheyyandi.
2. **New query** click cheyyandi.
3. GitHub lo `supabase/schema.sql` file open chesi, **Raw** button click
   chesi, motham text copy cheyyandi (**Cmd + A**, **Cmd + C**).
4. Supabase SQL editor lo paste chesi (**Cmd + V**), kinda kudi vaipu
   **Run** click cheyyandi. "Success. No rows returned" vaste correct.
5. Malli **New query** → `supabase/seed.sql` copy → paste → **Run**.
   Idi 24 categories, WELCOME50 promo, 8 sample shops add chestundi.

## Step 3 — Login settings

1. Left menu lo **Authentication → Sign In / Providers** (or **Providers**).
2. **Email** provider open chesi **Confirm email** ni **OFF** cheyyandi,
   **Save** click cheyyandi.
   (Mana app lo phone number + password tho login. Lopala phone number ni
   email laaga vaadutam, anduke confirm email off cheyyali. Tarvata SMS
   OTP add cheddam.)

## Step 4 — Keys naaku pampandi

1. Left menu lo **Project Settings** (⚙️) → **API** (or **Data API**).
2. Ee rendu copy chesi naaku chat lo pampandi:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / public** key (`eyJ...` tho start avutundi, leda `sb_publishable_...`)

   Ee rendu safe — website lo public ga untayi, security mana RLS rules chustayi.

3. ⚠️ **service_role / secret key ni EVARIKEE ivvakandi**, chat lo kuda
   pettakandi. Adi motham database ki master key.

## Step 5 — Vercel lo keys pettandi

1. **vercel.com** → mana-bazar project → **Settings → Environment Variables**.
2. Ee rendu add cheyyandi (Production + Preview rendu tick cheyyandi):
   - `VITE_SUPABASE_URL` = mee Project URL
   - `VITE_SUPABASE_ANON_KEY` = mee anon key
3. **Save** click cheyyandi.

Tarvata nenu website code ni Supabase ki connect chestanu (Phase 1b).
