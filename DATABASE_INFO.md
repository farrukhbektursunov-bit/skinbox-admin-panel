# Admin Panel uchun Database Ma'lumotlari

## Database Connection

### Environment Variables (.env faylida)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/beautyuz
SESSION_SECRET=your_very_secure_session_secret_key_at_least_32_characters
NODE_ENV=development
PORT=3000
```

### Replit Environment Variables (ishlatilmoqda)
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST` - Database host
- `PGPORT` - Database port (5432)
- `PGUSER` - Database username
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name (beautyuz)

## Database Schema

### Asosiy Jadvallar

#### users - Foydalanuvchilar
- `id` (varchar, primary key) - Unikal ID
- `email` (varchar, unique) - Email manzil
- `password` (text) - Shifrlangan parol
- `firstName` (varchar) - Ism
- `lastName` (varchar) - Familiya
- `phone` (varchar) - Telefon raqam
- `isPhoneVerified` (boolean) - Telefon tasdiqlangan
- `address` (text) - Manzil
- `isAdmin` (boolean) - Admin huquqi (ishlatilmaydi)
- `createdAt` (timestamp) - Yaratilgan vaqt

#### products - Mahsulotlar
- `id` (varchar, primary key) - Mahsulot ID
- `nameUz` (text) - Mahsulot nomi (o'zbek)
- `nameEn` (text) - Mahsulot nomi (ingliz)
- `descriptionUz` (text) - Tavsif (o'zbek)
- `descriptionEn` (text) - Tavsif (ingliz)
- `price` (numeric) - Narx
- `originalPrice` (numeric) - Asl narx
- `images` (jsonb) - Rasm URL'lari
- `categoryId` (varchar) - Kategoriya ID
- `brandId` (varchar) - Brend ID
- `inStock` (boolean) - Mavjudligi
- `stockQuantity` (integer) - Zaxira miqdori
- `rating` (numeric) - Reyting
- `reviewsCount` (integer) - Sharhlar soni
- `salesCount` (integer) - Sotilgan miqdor
- `isNew` (boolean) - Yangi mahsulot
- `isFeatured` (boolean) - Tavsiya etilgan
- `createdAt` (timestamp) - Yaratilgan vaqt

#### orders - Buyurtmalar
- `id` (varchar, primary key) - Buyurtma ID
- `userId` (varchar) - Foydalanuvchi ID
- `status` (text) - Holat (pending, processing, shipped, delivered, cancelled)
- `totalAmount` (numeric) - Umumiy summa
- `shippingAddress` (jsonb) - Yetkazib berish manzili
- `paymentMethod` (text) - To'lov usuli
- `paymentStatus` (text) - To'lov holati (pending, paid, failed)
- `items` (jsonb) - Buyurtma elementlari
- `notes` (text) - Izohlar
- `createdAt` (timestamp) - Yaratilgan vaqt

#### categories - Kategoriyalar
- `id` (varchar, primary key) - Kategoriya ID
- `nameUz` (text) - Nom (o'zbek)
- `nameEn` (text) - Nom (ingliz)
- `slug` (varchar) - URL slug
- `image` (text) - Rasm URL
- `createdAt` (timestamp) - Yaratilgan vaqt

#### brands - Brendlar
- `id` (varchar, primary key) - Brend ID
- `name` (text) - Brend nomi
- `slug` (varchar) - URL slug
- `logo` (text) - Logo URL
- `description` (text) - Tavsif
- `createdAt` (timestamp) - Yaratilgan vaqt

#### cart_items - Savatcha
- `id` (varchar, primary key) - Element ID
- `userId` (varchar) - Foydalanuvchi ID
- `productId` (varchar) - Mahsulot ID
- `quantity` (integer) - Miqdor
- `createdAt` (timestamp) - Yaratilgan vaqt

#### wishlist_items - Sevimlilar
- `id` (varchar, primary key) - Element ID
- `userId` (varchar) - Foydalanuvchi ID
- `productId` (varchar) - Mahsulot ID
- `createdAt` (timestamp) - Yaratilgan vaqt

#### product_reviews - Mahsulot sharhlari
- `id` (varchar, primary key) - Sharh ID
- `userId` (varchar) - Foydalanuvchi ID
- `productId` (varchar) - Mahsulot ID
- `orderId` (varchar) - Buyurtma ID
- `rating` (integer) - Baho (1-5 yulduz)
- `comment` (text) - Sharh matni
- `images` (jsonb) - Rasm URL'lari
- `createdAt` (timestamp) - Yaratilgan vaqt

#### payment_methods - To'lov usullari
- `id` (varchar, primary key) - Usul ID
- `userId` (varchar) - Foydalanuvchi ID
- `type` (text) - Turi (uzcard, humo, visa, mastercard)
- `lastFour` (text) - Oxirgi 4 raqam
- `holderName` (text) - Karta egasi
- `expiryDate` (text) - Amal qilish muddati
- `isDefault` (boolean) - Asosiy karta
- `createdAt` (timestamp) - Yaratilgan vaqt

#### return_requests - Qaytarish so'rovlari
- `id` (varchar, primary key) - So'rov ID
- `userId` (varchar) - Foydalanuvchi ID
- `orderId` (varchar) - Buyurtma ID
- `productId` (varchar) - Mahsulot ID
- `type` (text) - Turi (return, exchange)
- `reason` (text) - Sabab
- `status` (text) - Holat (pending, approved, rejected, completed)
- `description` (text) - Tavsif
- `images` (jsonb) - Rasm URL'lari
- `createdAt` (timestamp) - Yaratilgan vaqt

#### gifts - Sovg'alar
- `id` (varchar, primary key) - Sovg'a ID
- `senderUserId` (varchar) - Jo'natuvchi ID
- `recipientName` (text) - Qabul qiluvchi nomi
- `recipientContact` (text) - Qabul qiluvchi aloqa
- `sendMethod` (text) - Jo'natish usuli (telegram, sms)
- `productId` (varchar) - Mahsulot ID
- `giftMessage` (text) - Sovg'a xabari
- `paymentStatus` (text) - To'lov holati (pending, paid, failed)
- `claimedBy` (varchar) - Kim oldi
- `claimedAt` (timestamp) - Olingan vaqt
- `createdAt` (timestamp) - Yaratilgan vaqt

#### phone_verification_codes - Telefon tasdiqlash kodlari
- `id` (varchar, primary key) - Kod ID
- `phone` (varchar) - Telefon raqam
- `code` (varchar) - Tasdiqlash kodi
- `expiresAt` (timestamp) - Amal qilish muddati
- `isUsed` (boolean) - Ishlatilgan
- `createdAt` (timestamp) - Yaratilgan vaqt

## Admin Panel uchun Kerakli Fayllar

### 1. src/shared/schema.ts
Barcha database schema va type'lar (nusxalangan)

### 2. src/lib/db.ts
Database connection konfiguratsiyasi

### 3. .env
Environment variables

### 4. package.json
Database dependency'lar qo'shilgan

## Database Connection Kodi

```typescript
import { db } from './lib/db';
import { users, orders, products, categories, brands } from './shared/schema';
import { eq, desc, asc } from 'drizzle-orm';

// Foydalanuvchilarni olish
const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

// Buyurtmalarni olish
const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

// Mahsulotlarni olish
const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
```

## Admin Panel Package Dependencies

Qo'shilgan dependency'lar:
- `@neondatabase/serverless` - Database client
- `drizzle-orm` - ORM
- `drizzle-zod` - Zod schemas
- `ws` - WebSocket support
- `zod` - Validation
- `date-fns` - Date utilities

## Environment Setup

1. Admin panel loyihasiga kiring:
   ```bash
   cd admin-panel
   ```

2. Dependencies'ni o'rnating:
   ```bash
   npm install
   ```

3. .env faylini to'g'ri sozlang

4. Server'ni ishga tushiring:
   ```bash
   npm run dev
   ```

## Database Access Examples

### Users Management
```typescript
// Get all users
const users = await db.select().from(users);

// Delete user with cascade
await db.delete(users).where(eq(users.id, userId));
```

### Orders Management
```typescript
// Get all orders with user info
const orders = await db.select({
  id: orders.id,
  status: orders.status,
  totalAmount: orders.totalAmount,
  user: {
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email
  }
}).from(orders).leftJoin(users, eq(orders.userId, users.id));
```

### Products Management
```typescript
// Update product
await db.update(products)
  .set({ name: 'Updated Name', price: 99.99 })
  .where(eq(products.id, productId));
```

Database to'liq ishga tushirilgan va admin panel uchun tayyor!