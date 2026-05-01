-- =============================================
-- Admin panel: akkauntni admin qilish (Supabase SQL Editor)
--
-- Yoki loyihada: .env ga SUPABASE_SERVICE_ROLE_KEY qo‘shib
--   npm run seed:admin
-- Yoki admin panel: Sozlamalar → Admin qo‘shish (RPC: supabase-promote-admin-rpc.sql)
--
-- 1) Dashboard → Authentication → Users → Add user
--    (email + parol bilan akkaunt yarating).
-- 2) Pastdagi admin_email qiymatini o'z emailingizga o'zgartiring.
-- 3) Butun skriptni Run qiling.
--
-- Eslatma: avval asosiy schema va supabase-admin-policies.sql
-- (role ustuni + is_admin) ishga tushgan bo'lishi kerak.
-- =============================================

do $$
declare
  admin_email text := 'admin@example.com';  -- ← BU YERNI O'ZGARTIRING
  uid uuid;
  disp_name text;
begin
  select u.id into uid
  from auth.users u
  where lower(trim(u.email)) = lower(trim(admin_email))
  limit 1;

  if uid is null then
    raise exception 'auth.users da "%" topilmadi. Avval Authentication → Users dan user yarating.', admin_email;
  end if;

  select coalesce(
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) into disp_name
  from auth.users u
  where u.id = uid;

  insert into public.profiles (id, full_name, role)
  values (uid, disp_name, 'admin')
  on conflict (id) do update
  set role = 'admin', updated_at = now();

  raise notice 'OK: % endi admin (profiles.role = admin)', admin_email;
end $$;

-- Tekshiruv
-- select id, email from auth.users;
-- select id, full_name, role from public.profiles where role = 'admin';
