# Admin Panel İstifadə Təlimatı

## Admin Giriş Məlumatları

Admin hesabı üçün giriş sistemi eyni login səhifəsindən istifadə edir. Admin hesabı yaratmaq üçün:

### 1. Admin Hesabı Yaratmaq

Admin hesabı yaratmaq üçün iki yol var:

#### Yol 1: Database-də birbaşa yaratmaq

```sql
-- Admin hesabı yaratmaq üçün (şifrə: admin123)
INSERT INTO "User" (
  "id", "email", "password", "firstName", "lastName", "role", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2b$10$...', -- bcrypt hash (admin123)
  'Admin',
  'User',
  'ADMIN',
  NOW(),
  NOW()
);
```

#### Yol 2: Register endpoint-dən istifadə etmək

- `/register` endpoint-inə POST request göndərin
- `role` field-ını `ADMIN` olaraq təyin edin
- Qeyd: Backend-də role validation olub-olmadığını yoxlayın

### 2. Admin Girişi

1. `/login` səhifəsinə gedin
2. Admin email və şifrəni daxil edin
3. "Daxil ol" düyməsini basın
4. Sistem sizi admin dashboard-a yönləndirəcək

### 3. Admin Dashboard Funksiyaları

Admin dashboard-da (`/dashboard`) aşağıdakı funksiyalar mövcuddur:

#### a) Gözləyən Çıxarışlar

- **URL**: `/payments/withdrawals/pending`
- **Funksiya**: Müəllimlərin çıxarış sorğularını görüntüləmək və idarə etmək
- **Əməliyyatlar**:
  - Çıxarış sorğularını təsdiqləmək (COMPLETED)
  - Çıxarış sorğularını rədd etmək (REJECTED) - səbəb yazmaq lazımdır

#### b) Admin Balansı

- **URL**: `/profile`
- **Funksiya**: Admin balansını görüntüləmək və pul çıxartmaq
- **Əməliyyatlar**:
  - Balansı görüntüləmək
  - Pul çıxartmaq (bank hesabı və bank adı ilə)

#### c) Stripe Account-ları Yaratmaq

- **URL**: `/teacher/stripe/create-accounts-for-all`
- **Funksiya**: Bütün müəllim və admin-lər üçün (Stripe account-u olmayanlar) avtomatik Stripe account yaratmaq
- **Əməliyyatlar**:
  - Bir düymə ilə bütün müəllim və admin-lər üçün Stripe account yaratmaq
  - Nəticələri görüntüləmək (uğurlu/uğursuz)

#### d) Statistika

- **URL**: `/analytics`
- **Funksiya**: Sistem statistikalarını görüntüləmək

### 4. Admin API Endpoint-ləri

#### Payment Endpoint-ləri

- `GET /payments/withdrawals/pending` - Gözləyən çıxarışları gətir
- `POST /payments/withdrawals/:id/status` - Çıxarış statusunu yenilə
- `POST /payments/withdraw/admin` - Admin pul çıxart

#### Teacher/Stripe Endpoint-ləri

- `POST /teacher/stripe/create-accounts-for-all` - Bütün müəllim və admin-lər üçün Stripe account yarat

### 5. Admin Üçün Xüsusi Xüsusiyyətlər

1. **Admin Balansı**: İmtahan ödənişlərindən 50% admin balansına düşür
2. **Stripe Transfer**: Admin-in Stripe account-u varsa, ödənişlər birbaşa Stripe-a transfer olunur
3. **Çıxarış İdarəetməsi**: Müəllimlərin çıxarış sorğularını təsdiqləyə və ya rədd edə bilər
4. **Stripe Account İdarəetməsi**: Bütün müəllim və admin-lər üçün Stripe account yarada bilər

### 6. Təhlükəsizlik Qeydləri

- Admin endpoint-ləri `@Roles(UserRole.ADMIN)` guard ilə qorunur
- Yalnız admin role-ü olan istifadəçilər admin funksiyalarına çata bilər
- Admin dashboard-da yalnız admin üçün xüsusi bölmələr göstərilir

### 7. İlk Quraşdırma

1. Database-də admin hesabı yaradın
2. Admin email və şifrəni qeyd edin
3. Admin hesabı ilə giriş edin
4. Admin-in Stripe account-unu yaradın (əgər lazımdırsa)
5. Müəllimlərin çıxarış sorğularını idarə etməyə başlayın

### 8. Admin Dashboard Görünüşü

Admin dashboard-da 4 əsas kart var:

1. **Gözləyən Çıxarışlar** - Müəllimlərin çıxarış sorğuları
2. **Admin Balansı** - Admin balansı və pul çıxartma
3. **Stripe Account-ları** - Stripe account yaratma
4. **Statistika** - Sistem statistikaları

---

**Qeyd**: Admin hesabı yaratmaq üçün backend-də role validation olub-olmadığını yoxlayın. Əgər register endpoint-i yalnız STUDENT və TEACHER role-lərinə icazə verirsə, admin hesabını database-də birbaşa yaratmaq lazımdır.

