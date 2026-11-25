-- Demo shops & products (optional). Run AFTER schema.sql.
-- Admin can later link real owners to these shops.

select set_config('mb.bypass','on',false);

insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000001','Sri Lakshmi Kirana & General','grocery','Brodipet, Guntur','Guntur',16.301,80.443,'9848010100','🛒','approved',4.0,20,15,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000001'::uuid,'Sona Masoori Rice','Atta, Rice & Dal',1450,1600,'25 kg','🍚','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Aashirvaad Atta','Atta, Rice & Dal',290,320,'5 kg','🌾','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Toor Dal','Atta, Rice & Dal',165,180,'1 kg','🫘','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Sunflower Oil','Oil, Ghee & Masala',145,160,'1 L','🛢️','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Red Chilli Powder','Oil, Ghee & Masala',90,110,'250 g','🌶️','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Turmeric Powder','Oil, Ghee & Masala',45,55,'100 g','🟡','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Amul Milk','Dairy, Bread & Eggs',33,33,'500 ml','🥛','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Brown Bread','Dairy, Bread & Eggs',45,50,'400 g','🍞','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Eggs','Dairy, Bread & Eggs',84,90,'12 pcs','🥚','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Lays Chips','Snacks & Biscuits',20,20,'52 g','🥔','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Good Day Biscuits','Snacks & Biscuits',30,35,'200 g','🍪','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Maggi Noodles','Snacks & Biscuits',56,60,'4 pack','🍜','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'3 Roses Tea','Tea, Coffee & Drinks',140,155,'250 g','🍵','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Bru Coffee','Tea, Coffee & Drinks',120,135,'100 g','☕','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Thums Up','Tea, Coffee & Drinks',40,40,'750 ml','🥤','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Colgate Toothpaste','Personal Care',95,110,'200 g','🪥','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Lux Soap','Personal Care',120,140,'4 x 100 g','🧼','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Surf Excel','Cleaning Essentials',210,240,'1 kg','🧺','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Vim Bar','Cleaning Essentials',30,35,'3 pcs','🧽','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Onion','Fruits & Vegetables',40,45,'1 kg','🧅','approved'),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Tomato','Fruits & Vegetables',30,40,'1 kg','🍅','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000001');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000002','Apollo Pharmacy Point','medical','Arundelpet, Guntur','Guntur',16.299,80.45,'9848010211','💊','approved',4.1,27,20,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000002'::uuid,'Paracetamol 650','Medicines',30,32,'15 tabs','💊','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'Cough Syrup','Medicines',110,125,'100 ml','🧴','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'ORS Sachet','Medicines',22,25,'1 pc','🥤','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'Digital Thermometer','Health Devices',199,299,'1 pc','🌡️','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'BP Monitor','Health Devices',1499,2200,'1 pc','🩺','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'Band-Aid','First Aid',50,55,'20 pcs','🩹','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'Dettol Antiseptic','First Aid',95,105,'250 ml','🧴','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'Baby Diapers','Baby Care',399,499,'M 30 pcs','👶','approved'),
  ('00000000-0000-0000-0000-000000000002'::uuid,'Face Masks','Personal Care',99,150,'10 pcs','😷','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000002');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000003','Karachi Bakers Point','bakery','Lakshmipuram, Guntur','Guntur',16.31,80.432,'9848010322','🎂','approved',4.2,34,25,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000003'::uuid,'Black Forest Cake','Cakes',450,500,'500 g','🎂','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Pineapple Cake','Cakes',400,450,'500 g','🍰','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Chocolate Pastry','Cakes',60,70,'1 pc','🍫','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Fruit Bread','Breads',45,50,'1 pack','🍞','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Pav Buns','Breads',30,35,'6 pcs','🥯','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Osmania Biscuits','Biscuits & Cookies',120,140,'400 g','🍪','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Fruit Biscuits','Biscuits & Cookies',160,180,'400 g','🍪','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Veg Puff','Snacks & Puffs',20,25,'1 pc','🥟','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Egg Puff','Snacks & Puffs',25,30,'1 pc','🥚','approved'),
  ('00000000-0000-0000-0000-000000000003'::uuid,'Kaju Barfi','Sweets',320,360,'250 g','🍬','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000003');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000004','Venkateswara Electricals','electrical','Kothapet, Guntur','Guntur',16.295,80.44,'9848010433','💡','approved',4.3,41,30,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000004'::uuid,'LED Bulb 9W','Lights',99,150,'1 pc','💡','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'Tube Light 20W','Lights',249,320,'1 pc','💡','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'Ceiling Fan','Fans',1899,2500,'1 pc','🌀','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'Table Fan','Fans',1299,1600,'1 pc','🌀','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'Wire 1.5mm','Wires & Switches',1250,1500,'90 m','🧵','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'Extension Board','Wires & Switches',349,450,'4 socket','🔌','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'AA Batteries','Batteries',80,100,'4 pcs','🔋','approved'),
  ('00000000-0000-0000-0000-000000000004'::uuid,'Electric Kettle','Appliances',699,999,'1.5 L','🫖','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000004');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000005','Vidya Stationery & Xerox','stationery','Near Govt School, Guntur','Guntur',16.305,80.438,'9848010544','✏️','approved',4.4,48,15,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000005'::uuid,'Long Notebook','Notebooks',45,50,'200 pages','📓','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'Classmate Notebook Pack','Notebooks',240,270,'6 pcs','📚','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'Ball Pens','Pens & Pencils',50,60,'10 pcs','🖊️','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'Natraj Pencils','Pens & Pencils',50,55,'10 pcs','✏️','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'Color Pencils','Art & Craft',90,110,'24 pcs','🖍️','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'Geometry Box','Office Supplies',120,150,'1 set','📐','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'A4 Paper Rim','Office Supplies',280,320,'500 sheets','📄','approved'),
  ('00000000-0000-0000-0000-000000000005'::uuid,'School Bag','School Bags',650,899,'1 pc','🎒','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000005');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000006','Rythu Fresh Fruits & Veggies','fruits','Rythu Bazar, Guntur','Guntur',16.312,80.446,'9848010655','🍎','approved',4.5,55,20,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000006'::uuid,'Banana','Fresh Fruits',50,60,'1 dozen','🍌','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Apple Shimla','Fresh Fruits',180,220,'1 kg','🍎','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Banganapalli Mango','Fresh Fruits',120,150,'1 kg','🥭','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Tomato','Fresh Vegetables',30,40,'1 kg','🍅','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Potato','Fresh Vegetables',35,40,'1 kg','🥔','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Brinjal','Fresh Vegetables',40,50,'500 g','🍆','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Coriander','Leafy & Herbs',10,15,'1 bunch','🌿','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Palak','Leafy & Herbs',20,25,'1 bunch','🥬','approved'),
  ('00000000-0000-0000-0000-000000000006'::uuid,'Kiwi','Exotic',120,140,'3 pcs','🥝','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000006');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000007','Annapurna Tiffins & Meals','restaurant','Pattabhipuram, Guntur','Guntur',16.315,80.43,'9848010766','🍛','approved',4.6,62,25,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000007'::uuid,'Idli (4 pcs)','Tiffins',40,45,'1 plate','🍘','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Masala Dosa','Tiffins',60,70,'1 plate','🫓','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Pesarattu Upma','Tiffins',70,80,'1 plate','🫓','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Veg Meals','Meals',120,140,'1 plate','🍛','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Chicken Biryani','Biryani',220,250,'1 plate','🍗','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Veg Biryani','Biryani',160,180,'1 plate','🍚','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Mirchi Bajji','Snacks',30,35,'4 pcs','🌶️','approved'),
  ('00000000-0000-0000-0000-000000000007'::uuid,'Filter Coffee','Beverages',25,30,'1 cup','☕','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000007');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000008','Heritage Milk Point','dairy','Brindavan Gardens, Guntur','Guntur',16.3,80.435,'9848010877','🥛','approved',4.7,69,30,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000008'::uuid,'Toned Milk','Milk',30,30,'500 ml','🥛','approved'),
  ('00000000-0000-0000-0000-000000000008'::uuid,'Full Cream Milk','Milk',36,36,'500 ml','🥛','approved'),
  ('00000000-0000-0000-0000-000000000008'::uuid,'Curd','Curd & Buttermilk',35,38,'500 g','🥣','approved'),
  ('00000000-0000-0000-0000-000000000008'::uuid,'Buttermilk','Curd & Buttermilk',15,15,'200 ml','🥤','approved'),
  ('00000000-0000-0000-0000-000000000008'::uuid,'Paneer','Paneer & Cheese',95,110,'200 g','🧀','approved'),
  ('00000000-0000-0000-0000-000000000008'::uuid,'Ghee','Butter & Ghee',330,360,'500 ml','🧈','approved'),
  ('00000000-0000-0000-0000-000000000008'::uuid,'Doodh Peda','Sweets',180,200,'250 g','🍬','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000008');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000009','Fresh Chicken & Mutton Center','meat','Nallapadu Road, Guntur','Guntur',16.292,80.428,'9848010988','🍗','approved',4.8,76,15,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000009'::uuid,'Chicken Curry Cut','Chicken',220,240,'1 kg','🍗','approved'),
  ('00000000-0000-0000-0000-000000000009'::uuid,'Boneless Chicken','Chicken',320,350,'1 kg','🍗','approved'),
  ('00000000-0000-0000-0000-000000000009'::uuid,'Mutton Curry Cut','Mutton',850,900,'1 kg','🥩','approved'),
  ('00000000-0000-0000-0000-000000000009'::uuid,'Rohu Fish','Fish & Seafood',260,280,'1 kg','🐟','approved'),
  ('00000000-0000-0000-0000-000000000009'::uuid,'Prawns','Fish & Seafood',450,500,'500 g','🦐','approved'),
  ('00000000-0000-0000-0000-000000000009'::uuid,'Country Eggs','Eggs',120,130,'12 pcs','🥚','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000009');
insert into public.shops (id,name,category,address,area,lat,lng,phone,icon,status,rating_avg,rating_count,eta,upi_id) values ('00000000-0000-0000-0000-000000000010','Sai Home & Kitchen Store','home','Kothapet Main Road, Guntur','Guntur',16.297,80.442,'9848011099','🏠','approved',4.0,83,20,'') on conflict (id) do nothing;
insert into public.products (shop_id,name,subcategory,price,mrp,unit,emoji,status) select * from (values
  ('00000000-0000-0000-0000-000000000010'::uuid,'Steel Kadai','Kitchenware',450,550,'1 pc','🍳','approved'),
  ('00000000-0000-0000-0000-000000000010'::uuid,'Pressure Cooker 5L','Kitchenware',1650,2100,'1 pc','🥘','approved'),
  ('00000000-0000-0000-0000-000000000010'::uuid,'Floor Cleaner','Cleaning',180,210,'1 L','🧴','approved'),
  ('00000000-0000-0000-0000-000000000010'::uuid,'Broom','Cleaning',90,110,'1 pc','🧹','approved'),
  ('00000000-0000-0000-0000-000000000010'::uuid,'Plastic Bucket','Plastic Items',180,220,'20 L','🪣','approved'),
  ('00000000-0000-0000-0000-000000000010'::uuid,'Agarbatti','Pooja Items',50,60,'1 pack','🪔','approved'),
  ('00000000-0000-0000-0000-000000000010'::uuid,'Camphor','Pooja Items',60,70,'100 g','🔥','approved')
) v where not exists (select 1 from public.products where shop_id='00000000-0000-0000-0000-000000000010');
