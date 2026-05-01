-- =============================================
-- Mahsulot rasmlari — Supabase Storage
-- SQL Editor da barchasini ketma-ket ishga tushiring.
--
-- MUHIM: storage policy ichida ba'zan public.is_admin() ishlamaydi;
-- shuning uchun admin tekshiruvi profiles ustida to'g'ridan-to'g'ri.
-- =============================================

-- Bucket (Dashboard → Storage da yo'q bo'lsa)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- Eski policy lar (nomlar o'zgargan bo'lishi mumkin)
drop policy if exists "product-images public read" on storage.objects;
drop policy if exists "product-images admin insert" on storage.objects;
drop policy if exists "product-images admin update" on storage.objects;
drop policy if exists "product-images admin delete" on storage.objects;
drop policy if exists "Product images public read" on storage.objects;
drop policy if exists "Product images admin write" on storage.objects;

-- O'qish: hamma (ochiq bucket uchun public URL)
create policy "product-images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

-- Yuklash: faqat tizimga kirgan VA profiles.role = 'admin'
-- (O'z profilingizni o'qish RLS bilan ruxsat etilgan)
create policy "product-images admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "product-images admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "product-images admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- is_admin() dan foydalanish ixtiyoriy (boshqa jadvallar uchun)
-- Storage policies yuqoridagi bilan ishlashi kerak.
