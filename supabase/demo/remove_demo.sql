-- Removes ALL demo data: the 240 demo shops (+ their products) and demo owner logins.
-- The original 8 sample shops (no owner) are removed too. Real shops are never touched.
select set_config('mana.internal', 'on', true);
delete from public.shops where is_sample;
delete from public.profiles where id in (select id from auth.users where email like '70000%.owner@users.manabazar.app');
delete from auth.users where email like '70000%.owner@users.manabazar.app';
