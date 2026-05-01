-- =============================================
-- Aksiyalar (chegirma kampaniyalari) jadvali
-- Supabase SQL Editor da ishga tushiring
--
-- Admin paneldan aksiya yaratganda products.sale_price yangilanadi,
-- SkinBox ilovasida chegirma ko'rinadi.
-- =============================================

-- products jadvaliga sale_price qo'shish (agar yo'q bo'lsa)
alter table public.products add column if not exists sale_price numeric;

-- Promotions jadvali
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  discount_percent numeric not null check (discount_percent >= 0 and discount_percent <= 100),
  product_ids     uuid[] not null default '{}',
  start_at        timestamptz,
  end_at          timestamptz,
  is_active       boolean not null default true,
  image_url       text,
  created_at      timestamptz default now(),
  created_by      uuid references auth.users(id) on delete set null
);

alter table public.promotions enable row level security;

-- Hamma faol aksiyalarni ko'ra oladi (SkinBox uchun)
create policy "Aktif aksiyalarni hamma ko'radi"
  on public.promotions for select
  using (true);

-- Admin aksiya yaratadi
create policy "Admin aksiya yaratadi"
  on public.promotions for insert
  with check (public.is_admin());

-- Admin aksiyani tahrirlaydi
create policy "Admin aksiyani tahrirlaydi"
  on public.promotions for update
  using (public.is_admin());

-- Admin aksiyani o'chiradi
create policy "Admin aksiyani o'chiradi"
  on public.promotions for delete
  using (public.is_admin());

create index if not exists idx_promotions_is_active on public.promotions (is_active);
create index if not exists idx_promotions_created_at on public.promotions (created_at desc);
