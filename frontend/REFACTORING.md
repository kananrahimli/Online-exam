# Frontend Refactoring Documentation

## Overview
Bu sənəd frontend layihəsinin refactoring prosesini izah edir. Refactoring zamanı funksionallıq dəyişdirilməyib, yalnız kod strukturunu yaxşılaşdırmaq məqsədi güdülüb.

## Yeni Struktur

### 1. Utility Funksiyaları (`lib/utils/`)
- **`date.ts`**: Tarix formatlaşdırma funksiyaları
  - `formatDate()`: Tarixi Azərbaycan dilində formatlaşdırır
  - `formatTime()`: Vaxtı formatlaşdırır
  - `formatDateTime()`: Tarix və vaxtı birlikdə formatlaşdırır
  - `getTimeRemaining()`: Qalan vaxtı hesablayır
  - `formatTimeMMSS()`: Vaxtı MM:SS formatında göstərir

- **`format.ts`**: Formatlaşdırma funksiyaları
  - `formatPercentage()`: Faizi formatlaşdırır
  - `formatCurrency()`: Pul məbləğini formatlaşdırır
  - `formatScore()`: Balı formatlaşdırır
  - `truncateText()`: Mətni kəsir
  - `formatPhoneNumber()`: Telefon nömrəsini formatlaşdırır

- **`validation.ts`**: Validasiya funksiyaları
  - `isValidEmail()`: Email validasiyası
  - `isValidPhone()`: Telefon validasiyası
  - `isValidVerificationCode()`: Kod validasiyası
  - `isValidPassword()`: Şifrə validasiyası
  - `isValidName()`: Ad validasiyası

### 2. Constant-lar (`lib/constants/`)
- **`routes.ts`**: Bütün route-lar və API endpoint-ləri
  - `ROUTES`: Frontend route-ları
  - `API_ENDPOINTS`: Backend API endpoint-ləri

- **`messages.ts`**: Xəta və uğur mesajları
  - `ERROR_MESSAGES`: Xəta mesajları
  - `SUCCESS_MESSAGES`: Uğur mesajları
  - `VALIDATION_MESSAGES`: Validasiya mesajları

- **`alert.ts`**: Alert component konfiqurasiyası
  - `ALERT_CONFIG`: Alert konfiqurasiyası
  - `ALERT_STYLES`: Alert stilləri

## Refactoring Edilmiş Fayllar

### Components
- ✅ `components/Alert.tsx` - Constant-lar istifadə edilir

## İstifadə Nümunələri

### Tarix Formatlaşdırma
```typescript
import { formatDate, formatTime } from '@/lib/utils';

const date = formatDate('2026-01-03');
const time = formatTime('2026-01-03T15:30:00Z');
```

### API Endpoint İstifadəsi
```typescript
import { API_ENDPOINTS } from '@/lib/constants/routes';

const examUrl = API_ENDPOINTS.EXAMS.DETAIL('exam-id');
const leaderboardUrl = API_ENDPOINTS.EXAMS.LEADERBOARD('exam-id');
```

### Xəta Mesajları
```typescript
import { ERROR_MESSAGES } from '@/lib/constants/messages';

console.error(ERROR_MESSAGES.REQUIRED);
```

## Növbəti Addımlar

1. ✅ Utility funksiyaları yaradıldı
2. ✅ Constant-lar yaradıldı
3. ✅ Alert component refactor edildi
4. ⏳ Digər component-lərdə utility funksiyalarının istifadəsi
5. ⏳ Kod təkrarlarının aradan qaldırılması
6. ⏳ Type safety yaxşılaşdırması

## Qeydlər

- Bütün dəyişikliklər funksionallığı dəyişdirməyib
- Kod strukturunu yaxşılaşdırmaq məqsədi güdülüb
- Type safety saxlanılıb
- Backward compatibility saxlanılıb

