# Stripe Connect Quraşdırması

## Problem

Stripe Connect account yaratmaq istəyəndə aşağıdakı xəta alırsınız:
```
You can only create new accounts if you've signed up for Connect
```

Bu o deməkdir ki, Stripe Connect hələ aktivləşdirilməyib.

## Həll

### 1. Stripe Dashboard-a daxil olun
- https://dashboard.stripe.com/ adresinə gedin
- Stripe account-unuzla giriş edin

### 2. Connect-i aktivləşdirin
1. Sol menyudan **Settings** → **Connect** seçin
2. Və ya birbaşa: https://dashboard.stripe.com/settings/connect
3. **"Get started"** və ya **"Activate Connect"** düyməsini basın
4. Formu doldurun:
   - Business type (Biznes növü)
   - Business details (Biznes məlumatları)
   - Bank account information (Bank hesab məlumatları)

### 3. Test Mode vs Live Mode

#### Test Mode (Development üçün)
- Test API keys istifadə edin (`sk_test_...`)
- Test mode-da Connect avtomatik aktivdir
- Test mode-da real pul transfer olunmur

#### Live Mode (Production üçün)
- Live API keys istifadə edin (`sk_live_...`)
- Connect-i aktivləşdirmək lazımdır
- Real pul transfer olunur

### 4. Environment Variables

`.env` faylınızda düzgün API key olduğundan əmin olun:

```env
# Test Mode üçün
STRIPE_SECRET_KEY=sk_test_...

# Live Mode üçün
STRIPE_SECRET_KEY=sk_live_...
```

### 5. Yenidən yoxlayın

Connect aktivləşdirildikdən sonra:
1. Backend server-i restart edin
2. `/teacher/stripe/create-accounts-for-all` endpoint-ini yenidən çağırın
3. Xəta olmamalıdır

## Qeydlər

- **Test Mode**: Development üçün test API keys istifadə edin
- **Live Mode**: Production üçün Connect-i aktivləşdirmək mütləqdir
- **Express Accounts**: Bu sistem Express account type istifadə edir (ən sadə)
- **Country**: Azərbaycan üçün `AZ` country code istifadə olunur

## Əlavə Məlumat

- Stripe Connect Documentation: https://stripe.com/docs/connect
- Express Accounts: https://stripe.com/docs/connect/express-accounts
- Test Mode: https://stripe.com/docs/connect/testing

## Problemlər

Əgər hələ də problem varsa:
1. Stripe Dashboard-da Connect statusunu yoxlayın
2. API key-in düzgün olduğundan əmin olun
3. Test mode-da işləyib-işləmədiyini yoxlayın
4. Stripe support ilə əlaqə saxlayın


