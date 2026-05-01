-- profiles jadvaliga role ustunini qo'shish
-- Supabase SQL Editor da avval buni ishga tushiring

alter table public.profiles add column if not exists role text default 'user'
  check (role is null or role in ('user', 'admin'));
