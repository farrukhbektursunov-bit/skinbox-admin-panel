-- =============================================
-- product_variants: admin INSERT / UPDATE / DELETE
-- Avval: skinbox github/supabase_schema.sql (product_variants jadvali)
-- Va: admin-panel/supabase-admin-policies.sql (is_admin)
-- =============================================

drop policy if exists "Admin variant qo'shadi" on public.product_variants;
create policy "Admin variant qo'shadi"
  on public.product_variants for insert
  with check (public.is_admin());

drop policy if exists "Admin variantni tahrirlaydi" on public.product_variants;
create policy "Admin variantni tahrirlaydi"
  on public.product_variants for update
  using (public.is_admin());

drop policy if exists "Admin variantni o'chiradi" on public.product_variants;
create policy "Admin variantni o'chiradi"
  on public.product_variants for delete
  using (public.is_admin());
