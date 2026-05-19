-- Mijozlarga shaxsiy bildirishnomalar + buyurtma holati o'zgarganda avtomatik xabar

create table if not exists public.user_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null default 'general'
              check (type in ('order', 'message', 'promotion', 'general')),
  order_id    uuid references public.orders(id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);

create index if not exists idx_user_notifications_order
  on public.user_notifications (order_id)
  where order_id is not null;

alter table public.user_notifications enable row level security;

drop policy if exists "Foydalanuvchi o'z bildirishnomalarini ko'radi" on public.user_notifications;
create policy "Foydalanuvchi o'z bildirishnomalarini ko'radi"
  on public.user_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Foydalanuvchi o'qilgan deb belgilaydi" on public.user_notifications;
create policy "Foydalanuvchi o'qilgan deb belgilaydi"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admin bildirishnoma yuboradi" on public.user_notifications;
create policy "Admin bildirishnoma yuboradi"
  on public.user_notifications for insert
  with check (public.is_admin());

drop policy if exists "Admin barcha bildirishnomalarni ko'radi" on public.user_notifications;
create policy "Admin barcha bildirishnomalarni ko'radi"
  on public.user_notifications for select
  using (public.is_admin());

-- Buyurtma holati xabari (INSERT va UPDATE)
create or replace function public.order_status_notification_text(
  p_status text,
  p_short_id text,
  p_old_status text default null
)
returns table (title text, body text)
language plpgsql
immutable
as $$
begin
  case p_status
    when 'awaiting_payment' then
      title := 'To''lov kutilmoqda';
      body := format(
        'Buyurtma #%s uchun onlayn to''lovni amalga oshiring. To''lovdan keyin buyurtma ishlovga olinadi.',
        p_short_id
      );
    when 'pending' then
      if p_old_status = 'awaiting_payment' then
        title := 'To''lov qabul qilindi';
        body := format(
          'Buyurtma #%s uchun to''lov tasdiqlandi. Buyurtmangiz tez orada tasdiqlanadi.',
          p_short_id
        );
      else
        title := 'Buyurtma qabul qilindi';
        body := format(
          'Buyurtma #%s qabul qilindi. Tez orada ko''rib chiqiladi.',
          p_short_id
        );
      end if;
    when 'confirmed' then
      title := 'Buyurtma tasdiqlandi';
      body := format(
        'Buyurtma #%s tasdiqlandi va tayyorlanmoqda.',
        p_short_id
      );
    when 'delivering' then
      title := 'Buyurtma yo''lda';
      body := format(
        'Buyurtma #%s yetkazib berish xizmatiga topshirildi.',
        p_short_id
      );
    when 'delivered' then
      title := 'Buyurtma yetkazildi';
      body := format(
        'Buyurtma #%s muvaffaqiyatli yetkazildi. Xaridingiz uchun rahmat!',
        p_short_id
      );
    when 'cancelled' then
      title := 'Buyurtma bekor qilindi';
      body := format(
        'Buyurtma #%s bekor qilindi. Savollar bo''lsa, qo''llab-quvvatlash bilan bog''laning.',
        p_short_id
      );
    else
      title := 'Buyurtma yangilandi';
      body := format('Buyurtma #%s holati yangilandi.', p_short_id);
  end case;
  return next;
end;
$$;

create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_id text;
  v_title text;
  v_body text;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  if new.user_id is null then
    return new;
  end if;

  v_short_id := upper(substring(new.id::text from 1 for 8));

  select t.title, t.body
    into v_title, v_body
    from public.order_status_notification_text(
      new.status,
      v_short_id,
      case when tg_op = 'UPDATE' then old.status::text else null end
    ) as t;

  insert into public.user_notifications (user_id, title, body, type, order_id)
  values (new.user_id, v_title, v_body, 'order', new.id);

  return new;
end;
$$;

drop trigger if exists notify_order_status_on_insert on public.orders;
create trigger notify_order_status_on_insert
  after insert on public.orders
  for each row
  execute function public.notify_order_status_change();

drop trigger if exists notify_order_status_on_update on public.orders;
create trigger notify_order_status_on_update
  after update of status on public.orders
  for each row
  execute function public.notify_order_status_change();
