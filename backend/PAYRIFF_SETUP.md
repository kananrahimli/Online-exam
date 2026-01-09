# PayRiff İnteqrasiyası Quraşdırması

## Environment Dəyişənləri

Backend `.env` faylına aşağıdakı dəyişənləri əlavə edin:

```env
# PayRiff API Konfiqurasiyası
PAYRIFF_SECRET_KEY=your_payriff_secret_key_here
PAYRIFF_MERCHANT=your_merchant_id_here
PAYRIFF_BASE_URL=https://api.payriff.com/api/v3
BACKEND_URL=http://localhost:3001
```

## PayRiff Hesabı Quraşdırması

1. **PayRiff Dashboard-a daxil olun:**
   - https://payriff.com/az/dashboard

2. **Merchant/Application ID-ni əldə edin:**
   - Dashboard-da "Connect" və ya "Merchant" bölməsinə keçin
   - Merchant ID-ni kopyalayın və `.env` faylında `PAYRIFF_MERCHANT` kimi təyin edin

3. **Secret Key əldə edin:**
   - Dashboard-da "API Keys" və ya "Settings" bölməsinə keçin
   - Secret Key-i yaradın və kopyalayın
   - `.env` faylında `PAYRIFF_SECRET_KEY` kimi təyin edin

## Xəta Həlləri

### "Application not found" xətası

Bu xəta aşağıdakı səbəblərdən ola bilər:

1. **PAYRIFF_MERCHANT düzgün təyin olunmayıb:**
   ```env
   PAYRIFF_MERCHANT=ES10901XX  # Düzgün merchant ID
   ```

2. **PAYRIFF_SECRET_KEY düzgün deyil:**
   ```env
   PAYRIFF_SECRET_KEY=your_actual_secret_key  # PayRiff dashboard-dan alınan key
   ```

3. **Test/Production mühiti:**
   - Test mühiti üçün: `https://sbpay.payriff.com/api/v3`
   - Production üçün: `https://api.payriff.com/api/v3`

## Test

1. Backend server-i restart edin:
   ```bash
   npm run dev
   ```

2. Balans artırma endpoint-ini test edin:
   ```bash
   POST http://localhost:3001/payments/add-balance
   Authorization: Bearer <token>
   Body: { "amount": 10 }
   ```

## Qeydlər

- PayRiff API v3 istifadə olunur
- Callback URL: `{BACKEND_URL}/payments/callback`
- Transfer API mövcud olmasa, avtomatik olaraq topup (MPAY wallet) istifadə olunur

