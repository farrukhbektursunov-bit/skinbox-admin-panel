-- =============================================
-- Admin panel (UI): mavjud Auth userni admin qilish
--
-- Mantiq `supabase-add-admin-by-email.sql` va `scripts/seed-admin.mjs`
-- dagi profiles yozish bilan bir xil:
--   insert into public.profiles (id, full_name, role) ... on conflict ...
--
-- Talab: avval `supabase-admin-policies.sql` (is_admin + role) ishga tushgan bo‘lsin.
-- Foydalanuvchi avval Dashboard → Authentication → Users dan ro‘yxatdan o‘tgan bo‘lishi kerak.
-- =============================================

create or replace function public.promote_user_to_admin_by_email(admin_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  disp_name text;
  norm_email text;
begin
  if admin_email is null or length(trim(admin_email)) = 0 then
    raise exception 'Email bo‘sh bo‘lmasligi kerak';
  end if;

  if not public.is_admin() then
    raise exception 'Faqat admin boshqa foydalanuvchini admin qila oladi';
  end if;

  norm_email := lower(trim(admin_email));

  select u.id into uid
  from auth.users u
  where lower(trim(u.email)) = norm_email
  limit 1;

  if uid is null then
    raise exception 'auth.users da bu email topilmadi: %. Avval Authentication → Users dan user yarating.', admin_email;
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
end;
$$;

revoke all on function public.promote_user_to_admin_by_email(text) from public;
grant execute on function public.promote_user_to_admin_by_email(text) to authenticated;
