-- =====================================================================
-- Mana Bazar — production database schema for Supabase (Postgres)
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Then run supabase/seed.sql once.
-- Safe to re-run: everything uses "if not exists" / "create or replace".
--
-- Roles: customer, owner (shop owner), delivery (delivery partner), admin.
-- Every table has Row Level Security (RLS) on, so each person can only
-- read/write the rows they are allowed to — even if someone copies the
-- public "anon" key out of the website.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PROFILES (one row per login, linked to Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer'
              check (role in ('customer','owner','delivery','admin')),
  name        text not null default '',
  phone       text not null default '',
  address     text,
  lat         double precision,
  lng         double precision,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Helper functions used by the security policies below.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and active), false)
$$;

-- "Trusted" = admin user, OR the server itself (Supabase SQL editor,
-- service-role key used by our payment webhook). Normal logged-in users
-- and visitors are never trusted.
create or replace function public.is_trusted() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or coalesce(current_setting('mana.internal', true), '') = 'on'
      or coalesce(nullif(current_setting('role', true), ''), 'none') not in ('authenticated', 'anon')
$$;

-- When someone signs up, create their profile automatically.
-- They may sign up as customer, owner or delivery — never as admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(new.raw_user_meta_data->>'role', 'customer');
begin
  if wanted not in ('customer','owner','delivery') then
    wanted := 'customer';
  end if;
  insert into public.profiles (id, role, name, phone, address)
  values (
    new.id,
    wanted,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'address'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody can change their own role or blocked status; only admin can.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trusted() then
    new.role := old.role;
    new.active := old.active;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- First-run admin: the very first logged-in person who calls this becomes
-- admin. After one admin exists it does nothing (no hardcoded admin).
create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.profiles where role = 'admin') then return false; end if;
  perform set_config('mana.internal', 'on', true);
  update public.profiles set role = 'admin' where id = auth.uid();
  perform set_config('mana.internal', 'off', true);
  return true;
end $$;

-- ---------------------------------------------------------------------
-- 2. CATEGORIES (admin can add new business categories any time)
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          text primary key,              -- e.g. 'grocery'
  name        text not null,                 -- English
  name_te     text not null default '',      -- Telugu
  icon        text not null default '🏪',
  color       text not null default '#f5f5f5',
  group_name  text not null default 'Other', -- e.g. 'Food & Beverages'
  kind        text not null default 'products'
              check (kind in ('products','services')), -- salon/laundry = services
  sort        int  not null default 100,
  active      boolean not null default true
);

-- ---------------------------------------------------------------------
-- 3. SHOPS (+ KYC verification)
-- ---------------------------------------------------------------------
create table if not exists public.shops (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references public.profiles(id) on delete set null,
  name                text not null,
  category_id         text not null references public.categories(id),
  address             text not null default '',
  icon                text not null default '🏪',
  banner_url          text,
  lat                 double precision,
  lng                 double precision,
  phone               text not null default '',
  upi_id              text,
  is_open             boolean not null default true,
  closed_message      text,                     -- shown when shop is OFF
  status              text not null default 'pending'
                      check (status in ('pending','approved','rejected','blocked')),
  -- KYC details for admin verification
  kyc_status          text not null default 'not_submitted'
                      check (kyc_status in ('not_submitted','submitted','verified','rejected')),
  owner_legal_name    text,
  gst_number          text,
  fssai_number        text,                     -- food shops
  drug_license_number text,                     -- medical shops
  trade_license_number text,
  kyc_doc_path        text,                     -- file in private 'kyc-docs' bucket
  kyc_note            text,                     -- admin's reason if rejected
  eta_minutes         int not null default 30,  -- prep/pack time
  min_order           numeric(10,2) not null default 0,
  delivery_radius_km  numeric(5,2) not null default 5,
  rating_avg          numeric(3,2) not null default 0,
  rating_count        int not null default 0,
  prices_confirmed_at timestamptz,              -- daily price check by owner
  is_sample           boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists shops_owner_idx on public.shops(owner_id);
create index if not exists shops_category_idx on public.shops(category_id);

-- Owners can edit their shop, but only admin can approve / verify KYC.
create or replace function public.protect_shop_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trusted() then
    new.status      := old.status;
    new.kyc_note    := old.kyc_note;
    new.rating_avg  := old.rating_avg;
    new.rating_count:= old.rating_count;
    new.is_sample   := old.is_sample;
    new.owner_id    := old.owner_id;
    -- owner may move KYC to 'submitted' but never to 'verified'
    if new.kyc_status not in ('not_submitted','submitted') then
      new.kyc_status := old.kyc_status;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_shop_fields on public.shops;
create trigger protect_shop_fields
  before update on public.shops
  for each row execute function public.protect_shop_fields();

-- New shops always start as pending (even if someone sends other values).
create or replace function public.new_shop_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trusted() then
    new.status := 'pending';
    new.is_sample := false;
    new.owner_id := auth.uid();
    if new.kyc_status not in ('not_submitted','submitted') then
      new.kyc_status := 'not_submitted';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists new_shop_defaults on public.shops;
create trigger new_shop_defaults
  before insert on public.shops
  for each row execute function public.new_shop_defaults();

-- ---------------------------------------------------------------------
-- 4. PRODUCTS (and services like haircut / laundry per kg)
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  mrp         numeric(10,2),
  unit        text not null default '1 pc',
  emoji       text not null default '📦',
  image_url   text,
  in_stock    boolean not null default true,
  stock_qty   int,                               -- null = not tracked
  offer_text  text,                              -- e.g. 'Buy 2 get 1'
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists products_shop_idx on public.products(shop_id);

-- ---------------------------------------------------------------------
-- 5. DELIVERY PARTNERS (extra details for role = 'delivery')
-- ---------------------------------------------------------------------
create table if not exists public.delivery_partners (
  id              uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type    text not null default 'bike',
  vehicle_number  text,
  driving_license text,
  approved        boolean not null default false,  -- admin approves
  is_online       boolean not null default false,
  current_lat     double precision,
  current_lng     double precision,
  last_seen       timestamptz,
  created_at      timestamptz not null default now()
);

create or replace function public.protect_partner_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trusted() then
    if tg_op = 'INSERT' then
      new.approved := false;
      new.id := auth.uid();
    else
      new.approved := old.approved;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_partner_fields on public.delivery_partners;
create trigger protect_partner_fields
  before insert or update on public.delivery_partners
  for each row execute function public.protect_partner_fields();

-- ---------------------------------------------------------------------
-- 6. SETTINGS (single row, admin-controlled)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                     int primary key default 1 check (id = 1),
  delivery_fee           numeric(10,2) not null default 20,
  free_delivery_above    numeric(10,2) not null default 499,
  commission_percent     numeric(5,2)  not null default 5,
  partner_pay_per_order  numeric(10,2) not null default 25,
  support_phone          text
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 7. PROMO CODES & HOME BANNERS
-- ---------------------------------------------------------------------
create table if not exists public.promo_codes (
  code          text primary key,               -- e.g. 'WELCOME50'
  description   text not null default '',
  discount_type text not null default 'flat' check (discount_type in ('flat','percent')),
  value         numeric(10,2) not null check (value > 0),
  min_order     numeric(10,2) not null default 0,
  max_discount  numeric(10,2),
  shop_id       uuid references public.shops(id) on delete cascade, -- null = all shops
  active        boolean not null default true,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.banners (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  subtitle   text,
  image_url  text,
  shop_id    uuid references public.shops(id) on delete cascade,
  promo_code text references public.promo_codes(code) on delete set null,
  active     boolean not null default true,
  sort       int not null default 100,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. ORDERS
-- ---------------------------------------------------------------------
create sequence if not exists public.order_seq start 1001;

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null default ('MB' || nextval('public.order_seq')),
  customer_id         uuid not null references public.profiles(id),
  shop_id             uuid not null references public.shops(id),
  delivery_partner_id uuid references public.profiles(id),
  items               jsonb not null,            -- [{product_id,name,price,qty,unit,emoji}]
  item_total          numeric(10,2) not null,
  delivery_fee        numeric(10,2) not null default 0,
  discount            numeric(10,2) not null default 0,
  promo_code          text,
  total               numeric(10,2) not null,
  payment_method      text not null check (payment_method in ('cod','upi','razorpay')),
  payment_status      text not null default 'pending'
                      check (payment_status in ('pending','paid','failed','refunded')),
  razorpay_order_id   text,
  razorpay_payment_id text,
  allow_substitutes   boolean not null default true,
  address             text not null,
  lat                 double precision,
  lng                 double precision,
  note                text,
  status              text not null default 'placed'
                      check (status in ('placed','accepted','packed','picked_up',
                                        'out_for_delivery','delivered','cancelled','rejected')),
  history             jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  delivered_at        timestamptz
);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_shop_idx on public.orders(shop_id);
create index if not exists orders_partner_idx on public.orders(delivery_partner_id);
create index if not exists orders_status_idx on public.orders(status);

-- Is the current user allowed to see this order?
create or replace function public.can_see_order(o public.orders) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or o.customer_id = auth.uid()
      or o.delivery_partner_id = auth.uid()
      or exists (select 1 from public.shops s where s.id = o.shop_id and s.owner_id = auth.uid())
$$;

-- Is the current user an approved delivery partner who is online?
create or replace function public.is_available_partner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.delivery_partners p
                 where p.id = auth.uid() and p.approved and p.is_online)
$$;

-- Can the current user see this person's profile (name/phone)?
-- Yes if it's themselves, they're admin, or they share an order.
create or replace function public.can_see_profile(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select pid = auth.uid() or public.is_admin()
      or exists (select 1 from public.orders o
                 left join public.shops s on s.id = o.shop_id
                 where public.can_see_order(o)
                   and pid in (o.customer_id, o.delivery_partner_id, s.owner_id))
$$;

-- Keep order rules on the server so nobody can cheat from the browser:
--  * the customer cannot mark their own order paid or change prices
--  * every status change is recorded in history
create or replace function public.guard_order_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_owner boolean := exists (select 1 from public.shops s where s.id = old.shop_id and s.owner_id = auth.uid());
begin
  if public.is_trusted() then
    null; -- admin / server may change anything
  else
    -- money / item fields are frozen after placing the order
    new.items := old.items; new.item_total := old.item_total;
    new.delivery_fee := old.delivery_fee; new.discount := old.discount;
    new.total := old.total; new.customer_id := old.customer_id;
    new.shop_id := old.shop_id; new.promo_code := old.promo_code;
    -- payment status only changes through the Razorpay webhook (service role)
    -- or by the shop confirming a COD/UPI payment
    if not is_owner then
      new.payment_status := old.payment_status;
      new.razorpay_payment_id := old.razorpay_payment_id;
    end if;

    if old.customer_id = auth.uid() and not is_owner then
      -- customer may only cancel before the shop accepts
      if new.status <> old.status and not (new.status = 'cancelled' and old.status = 'placed') then
        raise exception 'You can only cancel before the shop accepts the order';
      end if;
      new.delivery_partner_id := old.delivery_partner_id;
    elsif is_owner then
      if new.status not in ('placed','accepted','packed','rejected','cancelled','picked_up','out_for_delivery','delivered') then
        new.status := old.status;
      end if;
    elsif public.my_role() = 'delivery' then
      -- a partner may take an unassigned packed order, or update their own
      if old.delivery_partner_id is null and new.delivery_partner_id = auth.uid()
         and old.status in ('accepted','packed') then
        null;
      elsif old.delivery_partner_id = auth.uid() then
        new.delivery_partner_id := old.delivery_partner_id;
        if new.status not in ('picked_up','out_for_delivery','delivered') and new.status <> old.status then
          new.status := old.status;
        end if;
        if new.status = 'delivered' and old.payment_method = 'cod' then
          new.payment_status := 'paid';
        end if;
      else
        raise exception 'Not your order';
      end if;
    end if;
  end if;

  if new.status <> old.status then
    new.history := old.history || jsonb_build_array(jsonb_build_object('status', new.status, 'at', now(), 'by', auth.uid()));
    if new.status = 'delivered' then new.delivered_at := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_order_update on public.orders;
create trigger guard_order_update
  before update on public.orders
  for each row execute function public.guard_order_update();

create or replace function public.new_order_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trusted() then
    new.customer_id := auth.uid();
    new.status := 'placed';
    new.payment_status := 'pending';
    new.delivery_partner_id := null;
  end if;
  new.history := jsonb_build_array(jsonb_build_object('status', 'placed', 'at', now()));
  return new;
end $$;

drop trigger if exists new_order_defaults on public.orders;
create trigger new_order_defaults
  before insert on public.orders
  for each row execute function public.new_order_defaults();

-- Server-side checkout: prices, delivery fee and promo discount are
-- computed HERE from the database, so a customer cannot edit prices in
-- the browser. The website calls: supabase.rpc('place_order', {...})
create or replace function public.place_order(
  p_shop_id uuid,
  p_items jsonb,              -- [{"product_id": "...", "qty": 2}, ...]
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_payment_method text,
  p_note text default null,
  p_promo_code text default null,
  p_allow_substitutes boolean default true
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  shop public.shops;
  cfg public.settings;
  promo public.promo_codes;
  line jsonb;
  prod public.products;
  lines jsonb := '[]'::jsonb;
  item_total numeric := 0;
  fee numeric := 0;
  disc numeric := 0;
  result public.orders;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select * into shop from public.shops where id = p_shop_id;
  if shop.id is null or shop.status <> 'approved' then raise exception 'Shop not available'; end if;
  if not shop.is_open then raise exception 'Shop is closed right now'; end if;
  if p_payment_method not in ('cod','upi','razorpay') then raise exception 'Invalid payment method'; end if;

  for line in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products
      where id = (line->>'product_id')::uuid and shop_id = p_shop_id;
    if prod.id is null then raise exception 'Item not found'; end if;
    if not prod.in_stock then raise exception '% is out of stock', prod.name; end if;
    if coalesce((line->>'qty')::int, 0) < 1 then raise exception 'Invalid quantity'; end if;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'product_id', prod.id, 'name', prod.name, 'price', prod.price,
      'qty', (line->>'qty')::int, 'unit', prod.unit, 'emoji', prod.emoji));
    item_total := item_total + prod.price * (line->>'qty')::int;
  end loop;
  if jsonb_array_length(lines) = 0 then raise exception 'Cart is empty'; end if;
  if item_total < shop.min_order then raise exception 'Minimum order is ₹%', shop.min_order; end if;

  select * into cfg from public.settings where id = 1;
  fee := case when item_total >= cfg.free_delivery_above then 0 else cfg.delivery_fee end;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into promo from public.promo_codes
      where code = upper(trim(p_promo_code)) and active
        and (expires_at is null or expires_at > now())
        and (shop_id is null or shop_id = p_shop_id);
    if promo.code is null then raise exception 'Invalid or expired promo code'; end if;
    if item_total < promo.min_order then raise exception 'Promo needs minimum ₹%', promo.min_order; end if;
    disc := case when promo.discount_type = 'flat' then promo.value
                 else round(item_total * promo.value / 100, 2) end;
    if promo.max_discount is not null then disc := least(disc, promo.max_discount); end if;
    disc := least(disc, item_total);
  end if;

  insert into public.orders (customer_id, shop_id, items, item_total, delivery_fee, discount,
                             promo_code, total, payment_method, address, lat, lng, note, allow_substitutes)
  values (auth.uid(), p_shop_id, lines, item_total, fee, disc,
          promo.code, item_total + fee - disc, p_payment_method, p_address, p_lat, p_lng, p_note, p_allow_substitutes)
  returning * into result;
  return result;
end $$;

-- ---------------------------------------------------------------------
-- 9. REVIEWS (one per delivered order) — keeps shop rating up to date
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid unique not null references public.orders(id) on delete cascade,
  shop_id     uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create or replace function public.refresh_shop_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid := coalesce(new.shop_id, old.shop_id);
begin
  perform set_config('mana.internal', 'on', true);
  update public.shops set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where shop_id = sid), 0),
    rating_count = (select count(*) from public.reviews where shop_id = sid)
  where id = sid;
  perform set_config('mana.internal', 'off', true);
  return null;
end $$;

drop trigger if exists refresh_shop_rating on public.reviews;
create trigger refresh_shop_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_shop_rating();

-- ---------------------------------------------------------------------
-- 10. CHAT MESSAGES (customer ↔ shop ↔ delivery partner, per order)
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  sender_id  uuid not null default auth.uid() references public.profiles(id),
  body       text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_order_idx on public.messages(order_id);

-- ---------------------------------------------------------------------
-- 11. SUPPORT TICKETS (user problems → admin)
-- ---------------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id),
  order_id    uuid references public.orders(id) on delete set null,
  subject     text not null,
  body        text not null,
  status      text not null default 'open' check (status in ('open','in_progress','resolved')),
  admin_reply text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.shops             enable row level security;
alter table public.products          enable row level security;
alter table public.delivery_partners enable row level security;
alter table public.settings          enable row level security;
alter table public.promo_codes       enable row level security;
alter table public.banners           enable row level security;
alter table public.orders            enable row level security;
alter table public.reviews           enable row level security;
alter table public.messages          enable row level security;
alter table public.support_tickets   enable row level security;

-- profiles: see yourself; admin sees all; people linked by an order can
-- see each other's name/phone (needed for delivery + calling).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (public.can_see_profile(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- categories / banners / promo codes / settings: everyone reads, admin writes
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists banners_read on public.banners;
create policy banners_read on public.banners for select using (active or public.is_admin());
drop policy if exists banners_admin on public.banners;
create policy banners_admin on public.banners for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists promo_read on public.promo_codes;
create policy promo_read on public.promo_codes for select using (
  active or public.is_admin()
  or exists (select 1 from public.shops s where s.id = promo_codes.shop_id and s.owner_id = auth.uid()));
drop policy if exists promo_admin on public.promo_codes;
create policy promo_admin on public.promo_codes for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists promo_owner on public.promo_codes;
create policy promo_owner on public.promo_codes for all
  using (exists (select 1 from public.shops s where s.id = promo_codes.shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = promo_codes.shop_id and s.owner_id = auth.uid()));

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for update using (public.is_admin());

-- shops: everyone sees approved shops; owner sees own; admin sees all
-- (helper so visitors who can't read orders can still list shops)
create or replace function public.rider_has_order_from(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.orders o where o.shop_id = sid and o.delivery_partner_id = auth.uid())
$$;

drop policy if exists shops_read on public.shops;
create policy shops_read on public.shops for select using (
  status = 'approved' or owner_id = auth.uid() or public.is_admin()
  or public.rider_has_order_from(id));
drop policy if exists shops_insert on public.shops;
create policy shops_insert on public.shops for insert
  with check (public.my_role() in ('owner','admin'));
drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops for update
  using (owner_id = auth.uid() or public.is_admin());
drop policy if exists shops_delete on public.shops;
create policy shops_delete on public.shops for delete using (public.is_admin());

-- products: visible if the shop is visible; owner/admin manage
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (
  exists (select 1 from public.shops s where s.id = products.shop_id
          and (s.status = 'approved' or s.owner_id = auth.uid() or public.is_admin())));
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_admin() or exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = auth.uid()));

-- delivery partners
drop policy if exists partners_read on public.delivery_partners;
create policy partners_read on public.delivery_partners for select using (
  id = auth.uid() or public.is_admin()
  or exists (select 1 from public.orders o where o.delivery_partner_id = delivery_partners.id
             and public.can_see_order(o) and o.status in ('picked_up','out_for_delivery')));
drop policy if exists partners_insert on public.delivery_partners;
create policy partners_insert on public.delivery_partners for insert
  with check (public.my_role() = 'delivery' or public.is_admin());
drop policy if exists partners_update on public.delivery_partners;
create policy partners_update on public.delivery_partners for update
  using (id = auth.uid() or public.is_admin());

-- orders
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select using (
  public.can_see_order(orders)
  -- approved, online partners can see orders waiting for a rider
  or (orders.delivery_partner_id is null and orders.status in ('accepted','packed')
      and public.is_available_partner()));
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (customer_id = auth.uid());
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update using (
  public.can_see_order(orders)
  or (orders.delivery_partner_id is null and orders.status in ('accepted','packed')
      and public.is_available_partner()));

-- reviews: everyone reads; customer reviews their own delivered order
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (
  customer_id = auth.uid()
  and exists (select 1 from public.orders o where o.id = reviews.order_id
              and o.customer_id = auth.uid() and o.status = 'delivered' and o.shop_id = reviews.shop_id));
drop policy if exists reviews_admin on public.reviews;
create policy reviews_admin on public.reviews for delete using (public.is_admin());

-- messages: only people on that order
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select using (
  exists (select 1 from public.orders o where o.id = messages.order_id and public.can_see_order(o)));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from public.orders o where o.id = messages.order_id and public.can_see_order(o)));

-- support tickets
drop policy if exists tickets_read on public.support_tickets;
create policy tickets_read on public.support_tickets for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists tickets_insert on public.support_tickets;
create policy tickets_insert on public.support_tickets for insert with check (user_id = auth.uid());
drop policy if exists tickets_admin on public.support_tickets;
create policy tickets_admin on public.support_tickets for update using (public.is_admin());

-- ---------------------------------------------------------------------
-- 13. ADMIN REPORTS (one call returns dashboard numbers)
-- ---------------------------------------------------------------------
create or replace function public.admin_report(p_from timestamptz default now() - interval '30 days',
                                               p_to timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb; cfg public.settings;
begin
  if not public.is_trusted() then raise exception 'Admins only'; end if;
  select * into cfg from public.settings where id = 1;
  select jsonb_build_object(
    'orders',            count(*),
    'delivered',         count(*) filter (where status = 'delivered'),
    'cancelled',         count(*) filter (where status in ('cancelled','rejected')),
    'gmv',               coalesce(sum(total) filter (where status = 'delivered'), 0),
    'commission',        coalesce(round(sum(item_total) filter (where status = 'delivered') * cfg.commission_percent / 100, 2), 0),
    'avg_delivery_min',  coalesce(round(avg(extract(epoch from (delivered_at - created_at)) / 60)
                                  filter (where status = 'delivered')), 0),
    'online_paid',       coalesce(sum(total) filter (where payment_status = 'paid' and payment_method <> 'cod'), 0),
    'cod_collected',     coalesce(sum(total) filter (where payment_status = 'paid' and payment_method = 'cod'), 0)
  ) into r
  from public.orders where created_at between p_from and p_to;
  return r || jsonb_build_object(
    'pending_shops',   (select count(*) from public.shops where status = 'pending'),
    'kyc_to_verify',   (select count(*) from public.shops where kyc_status = 'submitted'),
    'partners_online', (select count(*) from public.delivery_partners where is_online and approved),
    'open_tickets',    (select count(*) from public.support_tickets where status <> 'resolved'));
end $$;

-- ---------------------------------------------------------------------
-- 14. STORAGE BUCKETS (product photos public, KYC documents private)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('kyc-docs', 'kyc-docs', false)
  on conflict (id) do nothing;

-- Files are stored under a folder named after the uploader's user id,
-- e.g. product-images/<user-id>/rice.jpg
drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists product_images_write on storage.objects;
create policy product_images_write on storage.objects for insert
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects for delete
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists kyc_read on storage.objects;
create policy kyc_read on storage.objects for select
  using (bucket_id = 'kyc-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists kyc_write on storage.objects;
create policy kyc_write on storage.objects for insert
  with check (bucket_id = 'kyc-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 15. REAL-TIME (orders, live rider location, chat update instantly)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['orders','delivery_partners','messages','shops','products'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 16. API PERMISSIONS (which roles may touch which tables / functions)
-- ---------------------------------------------------------------------
-- Remove broad default privileges that bypass row level security.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- Visitors (not logged in) can only READ public catalog data.
grant select on public.categories, public.shops, public.products, public.settings,
  public.promo_codes, public.banners, public.reviews to anon;

-- Logged-in users: row level security policies decide which rows.
grant select, insert, update, delete on public.profiles, public.categories, public.shops,
  public.products, public.delivery_partners, public.settings, public.promo_codes,
  public.banners, public.orders, public.reviews, public.messages, public.support_tickets
  to authenticated;
grant usage, select on sequence public.order_seq to authenticated;

-- Server (payment webhook) uses service_role.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Trigger functions: never callable through the API (triggers still fire).
revoke execute on function public.handle_new_user(), public.protect_profile_fields(),
  public.protect_shop_fields(), public.new_shop_defaults(), public.protect_partner_fields(),
  public.guard_order_update(), public.new_order_defaults(), public.refresh_shop_rating()
  from public, anon, authenticated;

-- App actions: logged-in users only (each checks permissions inside).
revoke execute on function public.place_order(uuid, jsonb, text, double precision, double precision, text, text, text, boolean),
  public.claim_first_admin(), public.admin_report(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, double precision, double precision, text, text, text, boolean),
  public.claim_first_admin(), public.admin_report(timestamptz, timestamptz)
  to authenticated;

-- Internal helper: only used by other functions, not by the API.
revoke execute on function public.is_trusted() from public, anon, authenticated;
