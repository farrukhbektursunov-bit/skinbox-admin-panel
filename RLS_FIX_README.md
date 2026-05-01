# Products RLS xatosi — "new row violates row-level security policy"

Bu xato admin panel orqali mahsulot qo'shishda paydo bo'ladi. Quyidagi qadamlarni bajaring:

## Yechim (Supabase SQL Editor da)

### Qadam 1: Admin policies va profillar

[Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** → **New query**

Quyidagi SQL ni butunlay nusxalab, **Run** bosing:

```sql
-- 1. Profiles jadvaliga role ustuni
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'
  CHECK (role IS NULL OR role IN ('user', 'admin'));

-- 2. is_admin() funksiyasi (RLS rekursiyasini oldini oladi)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT (p.role = 'admin') FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Products uchun admin INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Admin mahsulot qo'shadi" ON public.products;
CREATE POLICY "Admin mahsulot qo'shadi"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin mahsulotni tahrirlaydi" ON public.products;
CREATE POLICY "Admin mahsulotni tahrirlaydi"
  ON public.products FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin mahsulotni o'chiradi" ON public.products;
CREATE POLICY "Admin mahsulotni o'chiradi"
  ON public.products FOR DELETE
  USING (public.is_admin());
```

### Qadam 2: O'z emailingizni admin qilish

Yana **New query** oching. `admin_email` ni o'z emailingizga o'zgartiring va **Run** bosing:

```sql
DO $$
DECLARE
  admin_email text := 'admin@skinbox.uz';  -- ← BU YERNI O'ZGARTIRING
  uid uuid;
  disp_name text;
BEGIN
  SELECT u.id INTO uid
  FROM auth.users u
  WHERE lower(trim(u.email)) = lower(trim(admin_email))
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth.users da "%" topilmadi. Avval Authentication → Users dan foydalanuvchi yarating.', admin_email;
  END IF;

  SELECT coalesce(
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) INTO disp_name
  FROM auth.users u
  WHERE u.id = uid;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (uid, disp_name, 'admin')
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', updated_at = now();

  RAISE NOTICE 'OK: % endi admin', admin_email;
END $$;
```

### Qadam 3: Tekshirish

- Admin panelda **chiqib**, qayta **login** qiling.
- Mahsulot qo'shishga urinib ko'ring.

---

## Xato sabablari

1. **supabase-admin-policies.sql** bajarilmagan — products uchun INSERT policy yo'q
2. Foydalanuvchi **profiles** da `role = 'admin'` emas
3. Foydalanuvchi **profiles** da umuman yo'q (yangi ro'yxatdan o'tgan)

Agar hali ham ishlamasa:
- Supabase → **Authentication** → **Users** — emailingiz ro'yxatda borligini tekshiring
- SQL: `SELECT id, full_name, role FROM public.profiles WHERE role = 'admin';` — admin profil borligini ko'ring
