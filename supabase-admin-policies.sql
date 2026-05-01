-- =============================================
-- Admin panel uchun qo'shimcha RLS (Supabase SQL Editor)
-- Avval asosiy SkinBox schemangizni ishga tushiring.
--
-- Admin tayinlash (email bo'yicha, oson): loyihadagi
--   supabase-add-admin-by-email.sql
-- Yoki UUID bilan:
--   update public.profiles set role = 'admin' where id = 'SIZNING_USER_UUID';
-- =============================================

alter table public.profiles add column if not exists role text default 'user'
  check (role is null or role in ('user', 'admin'));

-- RLS rekursiyasidan qochish: admin tekshiruvi
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (p.role = 'admin') from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Mahsulotlar: admin qo'shadi / tahrirlaydi / o'chiradi
drop policy if exists "Admin mahsulot qo'shadi" on public.products;
create policy "Admin mahsulot qo'shadi"
  on public.products for insert
  with check (public.is_admin());

drop policy if exists "Admin mahsulotni tahrirlaydi" on public.products;
create policy "Admin mahsulotni tahrirlaydi"
  on public.products for update
  using (public.is_admin());

drop policy if exists "Admin mahsulotni o'chiradi" on public.products;
create policy "Admin mahsulotni o'chiradi"
  on public.products for delete
  using (public.is_admin());

-- Buyurtmalar: admin barchasini ko'radi va statusni yangilaydi
drop policy if exists "Admin barcha buyurtmalarni ko'radi" on public.orders;
create policy "Admin barcha buyurtmalarni ko'radi"
  on public.orders for select
  using (public.is_admin());

drop policy if exists "Admin buyurtmani yangilaydi" on public.orders;
create policy "Admin buyurtmani yangilaydi"
  on public.orders for update
  using (public.is_admin());

-- Mijozlar ro'yxati: admin barcha profillarni ko'radi
drop policy if exists "Admin barcha profillarni ko'radi" on public.profiles;
create policy "Admin barcha profillarni ko'radi"
  on public.profiles for select
  using (public.is_admin());
