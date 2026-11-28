"""Builds demo shops (10 per department) with owner logins and products.
Everything is marked is_sample = true so it can be removed with remove_demo.sql.
Output: seed_demo_*.sql (run in order) + demo_logins.csv"""
import csv, random, uuid, json
from pathlib import Path

random.seed(2026)
HERE = Path(__file__).parent
PASSWORD = 'Demo@1234'

CATS = [  # id, icon, shop suffix
 ('grocery','🛒','Kirana Store'),('supermarket','🏬','Super Market'),('clothing','👕','Fashions'),
 ('footwear','👟','Footwear'),('electronics','📺','Electronics'),('mobile','📱','Mobiles'),
 ('restaurant','🍛','Restaurant'),('bakery','🎂','Bakery'),('sweets','🍬','Sweets'),
 ('dairy','🥛','Dairy & Milk Centre'),('fruits','🍎','Fruits & Vegetables'),('furniture','🛋️','Furniture'),
 ('hardware','🔧','Hardware'),('paints','🎨','Paints'),('electrical','💡','Electricals'),
 ('plumbing','🚿','Plumbing & Sanitary'),('building','🧱','Steel & Cement'),('medical','💊','Medical & General Store'),
 ('diagnostics','🧪','Diagnostics'),('clinic','🩺','Clinic'),('stationery','✏️','Stationery'),
 ('books','📚','Book House'),('laundry','🧺','Laundry & Dry Cleaners'),('salon','💇','Unisex Salon'),
]
PREFIX = ['Sri Lakshmi','Sri Venkateswara','Sai Ram','Balaji','Durga Bhavani','Annapurna','Vijaya','Raghavendra','Siri','Hanuman']
AREAS = [  # Hyderabad east, around Nagole (lat, lng)
 ('Nagole', 17.3730, 78.5650), ('Bandlaguda', 17.3640, 78.5770), ('LB Nagar', 17.3457, 78.5522),
 ('Uppal', 17.4058, 78.5591), ('Dilsukhnagar', 17.3688, 78.5247), ('Kothapet', 17.3683, 78.5413),
 ('Vanasthalipuram', 17.3316, 78.5636), ('Boduppal', 17.4139, 78.5784), ('Ramanthapur', 17.3986, 78.5368),
 ('Habsiguda', 17.4086, 78.5432),
]
FOOD = {'restaurant','bakery','sweets','dairy','fruits','grocery','supermarket'}
SERVICE = {'laundry','salon','clinic','diagnostics'}

def q(s):
    return "'" + str(s).replace("'", "''") + "'"

catalog = {}
for line in (HERE / 'catalog.txt').read_text().splitlines():
    if not line.strip() or line.startswith('#'): continue
    dept, typ, name, unit, price, emoji = [x.strip() for x in line.split('|')]
    catalog.setdefault(dept, []).append((typ, name, unit, int(price), emoji))

def describe(dept, typ, name, unit):
    if dept in SERVICE:
        return f"{name} — {unit}. Book through Mana Bazar and the team will confirm your slot on call."
    if dept in ('restaurant', 'bakery', 'sweets'):
        return f"Freshly made {name.lower()} ({unit}). Prepared after you order and packed hot/fresh for delivery."
    if dept == 'fruits':
        return f"Farm-fresh {name.lower()}, hand-picked every morning. Pack size: {unit}. Weight may vary slightly."
    if dept in ('electronics', 'mobile', 'furniture'):
        return f"{name}. {unit}. Brand-new with shop bill and manufacturer warranty. Installation/demo on request."
    return f"{name} ({unit}) in the {typ.lower()} range. Genuine product with MRP printed on the pack."

users, shops, products, logins = [], [], [], []
for ci, (cat, icon, suffix) in enumerate(CATS, start=1):
    for si in range(1, 11):
        uid = str(uuid.uuid4()); sid = str(uuid.uuid4())
        phone = f"70000{ci:02d}{si:03d}"
        area, lat, lng = AREAS[si - 1]
        lat += random.uniform(-0.006, 0.006); lng += random.uniform(-0.006, 0.006)
        name = f"{PREFIX[si - 1]} {suffix}"
        owner = f"Demo Owner {ci:02d}-{si:02d}"
        email = f"{phone}.owner@users.manabazar.app"
        meta = {'role': 'owner', 'name': owner, 'phone': phone, 'address': f"{area}, Hyderabad"}
        users.append((uid, email, meta))
        lic = {'fssai_number': f"1{random.randint(10**12, 10**13 - 1)}"} if cat in FOOD else (
              {'drug_license_number': f"TS/HYD/2026/{random.randint(1000, 9999)}"} if cat == 'medical' else {})
        desc = (f"{name}, {area}. Serving the neighbourhood with {suffix.lower()} since {random.randint(2005, 2022)}. "
                f"Open {random.choice(['7 AM','8 AM','9 AM'])} – {random.choice(['9 PM','10 PM','10:30 PM'])}. Demo shop for testing Mana Bazar.")
        shops.append(dict(id=sid, owner_id=uid, name=name, category_id=cat, address=f"Main Road, {area}, Hyderabad",
            icon=icon, lat=round(lat, 6), lng=round(lng, 6), phone=phone, eta=random.choice([20, 25, 30, 35, 45]),
            desc=desc, legal=owner, lic=lic, rating=round(random.uniform(3.8, 4.8), 1), rcount=random.randint(8, 240),
            is_open=random.random() > 0.1))
        logins.append([cat, name, area, phone, PASSWORD])
        for (typ, pname, unit, price, emoji) in catalog.get(cat, []):
            p = max(1, round(price * random.uniform(0.92, 1.08)))
            mrp = max(p, round(price * random.uniform(1.0, 1.18)))
            products.append(dict(shop=sid, name=pname, typ=typ, unit=unit, price=p, mrp=mrp, emoji=emoji,
                desc=describe(cat, typ, pname, unit), stock=random.random() > 0.05,
                qty=None if cat in SERVICE else random.randint(3, 80)))


# Compact SQL: the database expands it (Postgres builds 240 users/shops and ~5,600 products).
cat_rows = ",\n".join(f"({q(d)},{q(t)},{q(n)},{q(u)},{p},{q(e)})" for d, items in catalog.items() for (t, n, u, p, e) in items)
cats = ",\n".join(f"({i},{q(c)},{q(ic)},{q(sf)})" for i, (c, ic, sf) in enumerate(CATS, start=1))
pref = ",".join(q(p) for p in PREFIX)
areas = ",\n".join(f"({i},{q(a)},{la},{ln})" for i, (a, la, ln) in enumerate(AREAS, start=1))
sql = f"""-- Mana Bazar demo data: 10 shops per department, owner logins, products.
-- All rows are is_sample = true. Remove with remove_demo.sql. Password for every demo owner: {PASSWORD}
do $$ begin
  if exists (select 1 from auth.users where email like '70000%.owner@users.manabazar.app') then
    raise exception 'Demo data already exists - run remove_demo.sql first';
  end if;
end $$;
select set_config('mana.internal', 'on', true);
create temp table demo_cat(dept text, typ text, name text, unit text, price int, emoji text);
insert into demo_cat values
{cat_rows};
create temp table demo_dept(ci int, dept text, icon text, suffix text);
insert into demo_dept values
{cats};
create temp table demo_area(si int, area text, lat float8, lng float8);
insert into demo_area values
{areas};
create temp table demo_shop as
select d.ci, a.si, d.dept, d.icon, d.suffix, a.area,
       gen_random_uuid() as uid, gen_random_uuid() as sid,
       '70000' || lpad(d.ci::text, 2, '0') || lpad(a.si::text, 3, '0') as phone,
       (array[{pref}])[a.si] || ' ' || d.suffix as shop_name,
       'Demo Owner ' || lpad(d.ci::text, 2, '0') || '-' || lpad(a.si::text, 2, '0') as owner_name,
       a.lat + (random() - 0.5) * 0.012 as lat, a.lng + (random() - 0.5) * 0.012 as lng
from demo_dept d cross join demo_area a;

with pw as (select extensions.crypt('{PASSWORD}', extensions.gen_salt('bf')) as h)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
select uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  phone || '.owner@users.manabazar.app', pw.h, now(),
  '{{"provider":"email","providers":["email"]}}'::jsonb,
  jsonb_build_object('role', 'owner', 'name', owner_name, 'phone', phone, 'address', area || ', Hyderabad'),
  now(), now(), '', '', '', ''
from demo_shop, pw;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), uid, uid::text,
  jsonb_build_object('sub', uid::text, 'email', phone || '.owner@users.manabazar.app', 'email_verified', true),
  'email', now(), now(), now()
from demo_shop;

insert into public.shops (id, owner_id, name, category_id, address, icon, lat, lng, phone, is_open, status, kyc_status,
  owner_legal_name, fssai_number, drug_license_number, eta_minutes, rating_avg, rating_count, is_sample, description,
  admin_checklist, phone_verified)
select sid, uid, shop_name, dept, 'Main Road, ' || area || ', Hyderabad', icon, lat, lng, phone,
  random() > 0.1, 'approved', 'verified', owner_name,
  case when dept in ('restaurant','bakery','sweets','dairy','fruits','grocery','supermarket')
       then '1' || (10000000000000 + floor(random() * 89999999999999))::bigint::text end,
  case when dept = 'medical' then 'TS/HYD/2026/' || (1000 + floor(random() * 9000))::int end,
  (array[20,25,30,35,45])[1 + floor(random() * 5)::int], round((3.8 + random())::numeric, 1), 8 + floor(random() * 230)::int,
  true,
  shop_name || ', ' || area || '. Serving the neighbourhood with ' || lower(suffix) || ' since ' || (2005 + floor(random() * 18))::int
    || '. Open ' || (array['7 AM','8 AM','9 AM'])[1 + floor(random() * 3)::int] || ' – '
    || (array['9 PM','10 PM','10:30 PM'])[1 + floor(random() * 3)::int] || '. Demo shop for testing Mana Bazar.',
  '{{"photo":true,"details":true,"docs":true,"phone":true}}'::jsonb, true
from demo_shop;

insert into public.products (shop_id, name, description, price, mrp, unit, emoji, in_stock, stock_qty, product_type)
select s.sid, c.name,
  case
    when c.dept in ('laundry','salon','clinic','diagnostics') then c.name || ' — ' || c.unit || '. Book through Mana Bazar and the team will confirm your slot on call.'
    when c.dept in ('restaurant','bakery','sweets') then 'Freshly made ' || lower(c.name) || ' (' || c.unit || '). Prepared after you order and packed fresh for delivery.'
    when c.dept = 'fruits' then 'Farm-fresh ' || lower(c.name) || ', hand-picked every morning. Pack size: ' || c.unit || '. Weight may vary slightly.'
    when c.dept in ('electronics','mobile','furniture') then c.name || '. ' || c.unit || '. Brand-new with shop bill and manufacturer warranty. Installation/demo on request.'
    else c.name || ' (' || c.unit || ') in the ' || lower(c.typ) || ' range. Genuine product with MRP printed on the pack.'
  end,
  p.price, greatest(p.price, round(c.price * (1 + random() * 0.18))), c.unit, c.emoji,
  random() > 0.05,
  case when c.dept in ('laundry','salon','clinic','diagnostics') then null else 3 + floor(random() * 78)::int end,
  c.typ
from demo_shop s
join demo_cat c on c.dept = s.dept
cross join lateral (select greatest(1, round(c.price * (0.92 + random() * 0.16))) as price) p;

drop table demo_cat; drop table demo_dept; drop table demo_area; drop table demo_shop;
select (select count(*) from public.shops where is_sample) as sample_shops,
       (select count(*) from public.products p join public.shops s on s.id = p.shop_id where s.is_sample) as sample_products;
"""
(HERE / 'seed_demo.sql').write_text(sql)
(HERE / 'remove_demo.sql').write_text("""-- Removes ALL demo data: the 240 demo shops (+ their products) and demo owner logins.
-- The original 8 sample shops (no owner) are removed too. Real shops are never touched.
select set_config('mana.internal', 'on', true);
delete from public.shops where is_sample;
delete from public.profiles where id in (select id from auth.users where email like '70000%.owner@users.manabazar.app');
delete from auth.users where email like '70000%.owner@users.manabazar.app';
""")
with open(HERE / 'demo_logins.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['department', 'shop', 'area', 'login_mobile', 'password']); w.writerows(logins)
print(len(shops), 'shops', len(products), 'products (approx)', len(sql)//1024, 'KB sql')
