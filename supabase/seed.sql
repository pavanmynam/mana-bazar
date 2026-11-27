-- =====================================================================
-- Mana Bazar — starting data. Run ONCE after schema.sql
-- (safe to re-run: nothing gets duplicated).
-- =====================================================================

-- 1. Business categories. Admin can add / hide more from the Admin panel.
insert into public.categories (id, name, name_te, icon, color, group_name, kind, sort) values
  ('grocery', 'Groceries / Kirana', 'కిరాణా', '🛒', '#e8f5e9', 'Retail & Fashion', 'products', 10),
  ('supermarket', 'Supermarkets', 'సూపర్ మార్కెట్', '🏬', '#e8f5e9', 'Retail & Fashion', 'products', 20),
  ('clothing', 'Clothing', 'బట్టలు', '👕', '#f3e5f5', 'Retail & Fashion', 'products', 30),
  ('footwear', 'Footwear', 'చెప్పులు & షూస్', '👟', '#efebe9', 'Retail & Fashion', 'products', 40),
  ('electronics', 'Electronics', 'ఎలక్ట్రానిక్స్', '📺', '#e3f2fd', 'Retail & Fashion', 'products', 50),
  ('mobile', 'Mobile Stores', 'మొబైల్స్', '📱', '#e8eaf6', 'Retail & Fashion', 'products', 60),
  ('restaurant', 'Restaurants', 'హోటల్స్', '🍛', '#ffebee', 'Food & Beverages', 'products', 70),
  ('bakery', 'Bakery', 'బేకరీ', '🎂', '#fff3e0', 'Food & Beverages', 'products', 80),
  ('sweets', 'Sweet Shops', 'స్వీట్స్', '🍬', '#fce4ec', 'Food & Beverages', 'products', 90),
  ('dairy', 'Dairy & Milk', 'పాలు', '🥛', '#e0f7fa', 'Food & Beverages', 'products', 100),
  ('fruits', 'Fruits & Veg', 'పండ్లు & కూరగాయలు', '🍎', '#fce4ec', 'Food & Beverages', 'products', 110),
  ('furniture', 'Furniture', 'ఫర్నిచర్', '🛋️', '#efebe9', 'Home & Hardware', 'products', 120),
  ('hardware', 'Hardware', 'హార్డ్‌వేర్', '🔧', '#eceff1', 'Home & Hardware', 'products', 130),
  ('paints', 'Paints', 'పెయింట్స్', '🎨', '#fff8e1', 'Home & Hardware', 'products', 140),
  ('electrical', 'Electrical', 'ఎలక్ట్రికల్', '💡', '#fffde7', 'Home & Hardware', 'products', 150),
  ('plumbing', 'Plumbing', 'ప్లంబింగ్', '🚿', '#e1f5fe', 'Home & Hardware', 'products', 160),
  ('building', 'Steel, Iron & Cement', 'స్టీల్, ఐరన్ & సిమెంట్', '🧱', '#eceff1', 'Home & Hardware', 'products', 170),
  ('medical', 'Medical Shops', 'మెడికల్', '💊', '#e3f2fd', 'Health & Emergency', 'products', 180),
  ('diagnostics', 'Diagnostic Centers', 'డయాగ్నోస్టిక్స్', '🧪', '#e0f2f1', 'Health & Emergency', 'services', 190),
  ('clinic', 'Clinics', 'క్లినిక్స్', '🩺', '#e0f2f1', 'Health & Emergency', 'services', 200),
  ('stationery', 'Stationery', 'స్టేషనరీ', '✏️', '#f3e5f5', 'Services & Others', 'products', 210),
  ('books', 'Book Stores', 'పుస్తకాలు', '📚', '#ede7f6', 'Services & Others', 'products', 220),
  ('laundry', 'Laundry', 'లాండ్రీ', '🧺', '#e1f5fe', 'Services & Others', 'services', 230),
  ('salon', 'Salons', 'సెలూన్', '💇', '#fce4ec', 'Services & Others', 'services', 240)
on conflict (id) do nothing;

-- 2. A welcome promo code (admin can edit or turn it off).
insert into public.promo_codes (code, description, discount_type, value, min_order, max_discount)
values ('WELCOME50', 'Rs 50 off your first order above Rs 299', 'flat', 50, 299, 50)
on conflict (code) do nothing;

-- 3. Sample shops (Guntur) so the app isn't empty on day one.
--    They are marked is_sample = true; admin can block/delete them once
--    real shops join.
insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000001', null, 'Sri Lakshmi Kirana', 'grocery', 'Brodipet, Guntur', '🛒', 16.3107, 80.4305, '9848010000', true, 'approved', 'verified', 20, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000001', 'Sona Masoori Rice', 1450, 1600, '25 kg', '🍚'),
  ('00000000-0000-0000-0000-000000000001', 'Toor Dal', 165, 180, '1 kg', '🫘'),
  ('00000000-0000-0000-0000-000000000001', 'Sunflower Oil', 145, 160, '1 L', '🛢️'),
  ('00000000-0000-0000-0000-000000000001', 'Sugar', 48, 52, '1 kg', '🧂'),
  ('00000000-0000-0000-0000-000000000001', 'Tata Salt', 28, 30, '1 kg', '🧂'),
  ('00000000-0000-0000-0000-000000000001', 'Red Chilli Powder', 90, 110, '250 g', '🌶️'),
  ('00000000-0000-0000-0000-000000000001', 'Tea Powder', 140, 155, '250 g', '🍵')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000001'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000002', null, 'Apollo Medicals', 'medical', 'Arundelpet, Guntur', '💊', 16.2977, 80.4475, '9848010111', true, 'approved', 'verified', 25, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000002', 'Paracetamol 650', 30, 32, '15 tabs', '💊'),
  ('00000000-0000-0000-0000-000000000002', 'Cough Syrup', 110, 125, '100 ml', '🧴'),
  ('00000000-0000-0000-0000-000000000002', 'Band-Aid', 50, 55, '20 pcs', '🩹'),
  ('00000000-0000-0000-0000-000000000002', 'Digital Thermometer', 199, 299, '1 pc', '🌡️'),
  ('00000000-0000-0000-0000-000000000002', 'ORS Sachet', 22, 25, '1 pc', '🥤'),
  ('00000000-0000-0000-0000-000000000002', 'Face Masks', 99, 150, '10 pcs', '😷')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000002'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000003', null, 'Karachi Bakery Point', 'bakery', 'Lakshmipuram, Guntur', '🎂', 16.3217, 80.4395, '9848010222', true, 'approved', 'verified', 30, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000003', 'Black Forest Cake', 450, 500, '500 g', '🎂'),
  ('00000000-0000-0000-0000-000000000003', 'Veg Puff', 20, 25, '1 pc', '🥟'),
  ('00000000-0000-0000-0000-000000000003', 'Osmania Biscuits', 120, 140, '400 g', '🍪'),
  ('00000000-0000-0000-0000-000000000003', 'Fruit Bread', 45, 50, '1 pack', '🍞'),
  ('00000000-0000-0000-0000-000000000003', 'Chocolate Pastry', 60, 70, '1 pc', '🍰'),
  ('00000000-0000-0000-0000-000000000003', 'Dil Kush', 30, 35, '1 pc', '🥐')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000003'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000004', null, 'Venkateswara Electricals', 'electrical', 'Kothapet, Guntur', '💡', 16.2887, 80.4225, '9848010333', true, 'approved', 'verified', 35, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000004', 'LED Bulb 9W', 99, 150, '1 pc', '💡'),
  ('00000000-0000-0000-0000-000000000004', 'Extension Board', 349, 450, '4 socket', '🔌'),
  ('00000000-0000-0000-0000-000000000004', 'Ceiling Fan', 1899, 2500, '1 pc', '🌀'),
  ('00000000-0000-0000-0000-000000000004', 'Wire 1.5mm', 1250, 1500, '90 m', '🧵'),
  ('00000000-0000-0000-0000-000000000004', 'AA Batteries', 80, 100, '4 pcs', '🔋'),
  ('00000000-0000-0000-0000-000000000004', 'Tube Light 20W', 249, 320, '1 pc', '💡')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000004'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000005', null, 'Vidya Stationery', 'stationery', 'Near Govt School, Guntur', '✏️', 16.3277, 80.4275, '9848010444', true, 'approved', 'verified', 20, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000005', 'Long Notebook', 45, 50, '200 pages', '📓'),
  ('00000000-0000-0000-0000-000000000005', 'Ball Pens', 50, 60, '10 pcs', '🖊️'),
  ('00000000-0000-0000-0000-000000000005', 'Geometry Box', 120, 150, '1 set', '📐'),
  ('00000000-0000-0000-0000-000000000005', 'A4 Paper Rim', 280, 320, '500 sheets', '📄'),
  ('00000000-0000-0000-0000-000000000005', 'Color Pencils', 90, 110, '24 pcs', '🖍️'),
  ('00000000-0000-0000-0000-000000000005', 'School Bag', 650, 899, '1 pc', '🎒')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000005'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000006', null, 'Fresh Fruits & Veggies', 'fruits', 'Rythu Bazar, Guntur', '🍎', 16.3007, 80.4555, '9848010555', true, 'approved', 'verified', 25, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000006', 'Banana', 50, 60, '1 dozen', '🍌'),
  ('00000000-0000-0000-0000-000000000006', 'Apple', 180, 220, '1 kg', '🍎'),
  ('00000000-0000-0000-0000-000000000006', 'Tomato', 30, 40, '1 kg', '🍅'),
  ('00000000-0000-0000-0000-000000000006', 'Onion', 40, 45, '1 kg', '🧅'),
  ('00000000-0000-0000-0000-000000000006', 'Mango (Banganapalli)', 120, 150, '1 kg', '🥭'),
  ('00000000-0000-0000-0000-000000000006', 'Green Chilli', 20, 25, '250 g', '🌶️')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000006'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000007', null, 'Annapurna Tiffins', 'restaurant', 'Pattabhipuram, Guntur', '🍛', 16.3157, 80.4605, '9848010666', true, 'approved', 'verified', 30, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000007', 'Idli (4 pcs)', 40, 45, '1 plate', '🍘'),
  ('00000000-0000-0000-0000-000000000007', 'Masala Dosa', 60, 70, '1 plate', '🫓'),
  ('00000000-0000-0000-0000-000000000007', 'Veg Meals', 120, 140, '1 plate', '🍛'),
  ('00000000-0000-0000-0000-000000000007', 'Chicken Biryani', 220, 250, '1 plate', '🍗'),
  ('00000000-0000-0000-0000-000000000007', 'Pesarattu', 55, 60, '1 plate', '🫓'),
  ('00000000-0000-0000-0000-000000000007', 'Filter Coffee', 25, 30, '1 cup', '☕')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000007'::uuid);

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status, eta_minutes, is_sample)
values ('00000000-0000-0000-0000-000000000008', null, 'Heritage Milk Point', 'dairy', 'Brindavan Gardens, Guntur', '🥛', 16.3047, 80.4155, '9848010777', true, 'approved', 'verified', 35, true)
on conflict (id) do nothing;
insert into public.products (shop_id, name, price, mrp, unit, emoji)
select v.shop_id::uuid, v.name, v.price, v.mrp, v.unit, v.emoji from (values
  ('00000000-0000-0000-0000-000000000008', 'Toned Milk', 30, 30, '500 ml', '🥛'),
  ('00000000-0000-0000-0000-000000000008', 'Curd', 35, 38, '500 g', '🥣'),
  ('00000000-0000-0000-0000-000000000008', 'Paneer', 95, 110, '200 g', '🧀'),
  ('00000000-0000-0000-0000-000000000008', 'Ghee', 330, 360, '500 ml', '🧈'),
  ('00000000-0000-0000-0000-000000000008', 'Butter Milk', 15, 15, '200 ml', '🥤')
) as v(shop_id, name, price, mrp, unit, emoji)
where not exists (select 1 from public.products p where p.shop_id = '00000000-0000-0000-0000-000000000008'::uuid);

