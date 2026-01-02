# Online İmtahan Platforması

AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli imtahan platforması.

## 🏗️ Layihə Strukturu

```
OnlineExam/
├── frontend/          # Next.js 14 (App Router)
│   ├── app/          # Sayfalar və routing
│   ├── components/   # React komponentləri
│   ├── lib/          # Utility funksiyalar, API client
│   ├── stores/       # Zustand state management
│   └── types/        # TypeScript tipləri
│
└── backend/          # NestJS REST API
    ├── src/
    │   ├── auth/     # Autentifikasiya modulu
    │   ├── exam/     # İmtahan modulu
    │   ├── payment/  # Ödəniş modulu
    │   ├── ai/       # AI inteqrasiyası
    │   └── exam-attempt/ # İmtahan cəhdi modulu
    └── prisma/       # Prisma schema və migration
```

## 🚀 Quraşdırma

### Tələblər

- Node.js 18+
- PostgreSQL
- npm və ya yarn

### Backend Quraşdırması

```bash
cd backend
npm install

# .env faylını yaradın
cp .env.example .env
# DATABASE_URL və digər environment dəyişənlərini təyin edin

# Prisma migration
npx prisma generate
npx prisma migrate dev

# Development server
npm run dev
```

Backend `http://localhost:3001` ünvanında işləyəcək.

### Frontend Quraşdırması

```bash
cd frontend
npm install

# .env.local faylını yaradın
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Development server
npm run dev
```

Frontend `http://localhost:3000` ünvanında işləyəcək.

## 🔧 Environment Dəyişənləri

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/online_exam"
JWT_SECRET="your-secret-key-here"
PORT=3001
FRONTEND_URL="http://localhost:3000"
OPENAI_API_KEY="your-openai-api-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 📋 Əsas Xüsusiyyətlər

### Şagird Funksiyaları
- ✅ Qeydiyyat və giriş
- ✅ Mövcud imtahanları görüntüləmə
- ✅ Ödəniş və imtahana giriş
- ✅ İmtahan nəticələrini görüntüləmə
- ✅ İmtahanları yenidən gözdən keçirmə

### Müəllim Funksiyaları
- ✅ Qeydiyyat və giriş
- ✅ Manual imtahan yaratma
- ✅ AI ilə imtahan yaratma
- ✅ İmtahan redaktə etmə
- ✅ İmtahan statistikalarını görüntüləmə

### Əsas Sistem Xüsusiyyətləri
- ✅ JWT əsaslı autentifikasiya
- ✅ Role-based access control (STUDENT, TEACHER, ADMIN)
- ✅ İmtahan versiyalaşdırma
- ✅ Ödəniş inteqrasiyası (Stripe)
- ✅ AI dəstəklı imtahan yaratma (OpenAI)
- ✅ İmtahan cəhdi və nəticə sistemi

## 🗄️ Database Schema

Əsas modellər:
- `User` - İstifadəçilər (Şagird, Müəllim, Admin)
- `Exam` - İmtahanlar
- `Question` - Suallar
- `Option` - Test variantları
- `ExamAttempt` - İmtahan cəhdləri
- `Answer` - Cavablar
- `Payment` - Ödənişlər
- `ExamTopic` - İmtahan mövzuları
- `ReadingText` - Mətn əsaslı suallar üçün mətnlər

## 🔐 API Endpoints

### Auth
- `POST /auth/register` - Qeydiyyat
- `POST /auth/login` - Giriş
- `GET /auth/me` - İstifadəçi profili

### Exams
- `GET /exams` - Bütün imtahanlar
- `GET /exams/published` - Yayımlanmış imtahanlar
- `GET /exams/:id` - İmtahan detalları
- `POST /exams` - Yeni imtahan (Müəllim)
- `PUT /exams/:id` - İmtahan redaktə (Müəllim)
- `POST /exams/:id/publish` - İmtahan yayımla (Müəllim)

### Payments
- `POST /payments` - Ödəniş yarat
- `GET /payments/success/:paymentId` - Ödəniş təsdiqlə

### Exam Attempts
- `POST /exam-attempts/:examId/start` - İmtahana başla
- `GET /exam-attempts/:attemptId` - İmtahan cəhdini al
- `PUT /exam-attempts/:attemptId/answers` - Cavab yadda saxla
- `POST /exam-attempts/:attemptId/submit` - İmtahanı təqdim et
- `GET /exam-attempts/:attemptId/result` - Nəticəni görüntülə

### AI
- `POST /ai/generate-exam` - AI ilə imtahan yarat (Müəllim)

## 📝 İstifadə Qaydaları

1. **Qeydiyyat**: Şagird və ya Müəllim kimi qeydiyyatdan keçin
2. **İmtahan Yaratma (Müəllim)**:
   - Manual olaraq imtahan yarada bilərsiniz
   - Və ya AI dəstəyi ilə 3 klikdə imtahan yarada bilərsiniz
3. **İmtahan Vermə (Şagird)**:
   - Mövcud imtahanları görüntüləyin
   - Ödəniş edin (5 AZN)
   - İmtahan vaxtı bitənə qədər giriş/çıxış edə bilərsiniz
   - İmtahanı tamamlayın və nəticələri görüntüləyin

## 🔮 Gələcək Planlar

- [ ] Açıq suallar üçün AI yoxlama
- [ ] Mobil optimallaşdırma
- [ ] İmtahan bankı
- [ ] Anti-cheat mexanizmləri (tab change detect, time limit)
- [ ] Paketlər və abunəlik sistemi
- [ ] Statistika və analitika dashboard

## 📄 Lisenziya

MIT

