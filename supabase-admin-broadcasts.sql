-- =============================================
-- Admin xabarlari (Xabarnoma) — SkinBox bilan bog'lash
-- Supabase SQL Editor da ishga tushiring
--
-- Admin paneldan yuborilgan xabarlar skinbox Notifications sahifasida ko'rinadi
-- =============================================

create table if not exists public.admin_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  type        text not null default 'news'
              check (type in ('news','promotion','order','general')),
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id) on delete set null
);

alter table public.admin_broadcasts enable row level security;

-- Admin xabar yozadi
create policy "Admin xabar yozadi"
  on public.admin_broadcasts for insert
  with check (public.is_admin());

-- Barcha ro'yxatdan o'tgan foydalanuvchilar o'qiydi (skinbox Notifications uchun)
create policy "Foydalanuvchilar admin xabarlarini o'qiydi"
  on public.admin_broadcasts for select
  using (auth.role() = 'authenticated');

-- Admin o'qiy oladi va o'chiradi (ixtiyoriy)
create policy "Admin barcha xabarlarni ko'radi"
  on public.admin_broadcasts for select
  using (public.is_admin());

create policy "Admin xabarni o'chiradi"
  on public.admin_broadcasts for delete
  using (public.is_admin());

-- Index tez o'qish uchun
create index if not exists idx_admin_broadcasts_created_at
  on public.admin_broadcasts (created_at desc);
