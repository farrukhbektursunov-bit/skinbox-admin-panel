/** Eski asosiy sluglar; mahsulot.category endi ixtiyoriy matn (product_categories.slug) */
export type ProductCategory =
  | 'cleansers'
  | 'serums'
  | 'moisturizers'
  | 'toners'
  | 'masks'
  | 'sunscreen'

export interface CategorySectionRow {
  id: string
  slug: string
  name_uz: string
  name_ru: string | null
  name_en: string | null
  sort_order: number
  created_at: string | null
}

export interface ProductCategoryRow {
  id: string
  section_id: string
  slug: string
  name_uz: string
  name_ru: string | null
  name_en: string | null
  sort_order: number
  created_at: string | null
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

export interface ProductRow {
  id: string
  name: string
  brand: string | null
  /** Ba’zi DB larda `desc` ustuni ishlatiladi — admin panel ikkalasini ham qo‘llab-quvvatlaydi */
  description: string | null
  desc?: string | null
  price: number
  image_url: string | null
  category: string | null
  rating: number | null
  in_stock: boolean | null
  stock_quantity: number | null
  sold_count: number | null
  images: string[] | null
  created_at: string | null
}

export type ProductVariantType = 'color' | 'size' | 'volume' | 'weight' | 'other'

export interface ProductVariantRow {
  id: string
  product_id: string
  type: ProductVariantType
  label: string
  value: string
  color_hex: string | null
  price_diff: number | null
  in_stock: boolean | null
  image_url: string | null
  sort_order: number | null
  created_at: string | null
}

export interface OrderRow {
  id: string
  user_id: string
  items: unknown
  total: number
  status: OrderStatus
  address: string
  phone: string
  full_name: string
  note: string | null
  created_at: string | null
}

export interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string | null
  phone: string | null
  birth_date: string | null
  gender: 'male' | 'female' | null
  role: 'user' | 'admin' | null
}

export interface PromotionRow {
  id: string
  title: string
  description: string | null
  discount_percent: number
  product_ids: string[] | null
  start_at: string | null
  end_at: string | null
  is_active: boolean
  image_url: string | null
  created_at: string | null
  created_by: string | null
}
