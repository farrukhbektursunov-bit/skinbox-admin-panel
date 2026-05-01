/**
 * Supabase da admin panel foydalanuvchisini yaratadi yoki yangilaydi:
 * - Auth: email + parol (email tasdiqlangan)
 * - profiles: role = admin
 *
 * Talab: .env da VITE_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY
 * (Dashboard → Settings → API → service_role — faqat server/skript, gitga qo‘ymang)
 *
 * Ishlatish: npm run seed:admin
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadDotEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env)) process.env[k] = v
  }
}

loadDotEnv()

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = (process.env.ADMIN_SEED_EMAIL || 'admin@skinbox.local').trim()
const password = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe_Admin123!'

if (!url || !serviceKey) {
  console.error(
    'Xato: .env da VITE_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY bo‘lishi kerak.\n' +
      'Service role kalitini faqat bu skript uchun ishlating; brauzerga qo‘shmang.'
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function isAlreadyExists(err) {
  const m = (err?.message || '').toLowerCase()
  return (
    m.includes('already been registered') ||
    m.includes('already exists') ||
    err?.status === 422
  )
}

let userId

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Admin' },
})

if (createErr) {
  if (!isAlreadyExists(createErr)) {
    console.error('createUser:', createErr.message)
    process.exit(1)
  }
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) {
    console.error('listUsers:', listErr.message)
    process.exit(1)
  }
  const found = list?.users?.find(
    (u) => (u.email || '').toLowerCase() === email.toLowerCase()
  )
  if (!found) {
    console.error('User topilmadi va yaratilmadi:', createErr.message)
    process.exit(1)
  }
  userId = found.id
  console.log('Mavjud auth user ishlatildi:', email)
} else {
  userId = created.user.id
  console.log('Yangi auth user yaratildi:', email)
}

const { error: profErr } = await admin.from('profiles').upsert(
  {
    id: userId,
    full_name: 'Admin',
    role: 'admin',
  },
  { onConflict: 'id' }
)

if (profErr) {
  console.error('profiles upsert:', profErr.message)
  console.error(
    'Tekshiring: profiles jadvalida `role` ustuni bormi? supabase-admin-policies.sql ishga tushganmi?'
  )
  process.exit(1)
}

console.log('')
console.log('Tayyor. Admin panelga shu email bilan kiring:')
console.log('  Email:', email)
if (process.env.ADMIN_SEED_PASSWORD) {
  console.log('  Parol: .env dagi ADMIN_SEED_PASSWORD')
} else {
  console.log('  Parol: standart (1-marta) ChangeMe_Admin123! — keyin .env da ADMIN_SEED_PASSWORD qo‘shing')
}
