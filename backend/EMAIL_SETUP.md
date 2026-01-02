# Email Service Setup

Bu sənəd email servisinin quraşdırılması üçün təlimatları ehtiva edir.

## App Password (Tətbiq Şifrəsi) nədir?

**App Password** (Tətbiq Şifrəsi) - bu, iki faktorlu autentifikasiya (2FA) aktiv olduqda, tətbiqlər və xidmətlər üçün yaradılan xüsusi şifrədir.

### Niyə lazımdır?

- Gmail və digər email provider-lər təhlükəsizlik məqsədi ilə tətbiqlərdən (SMTP) istifadə üçün adi şifrə yerinə **App Password** tələb edir
- Bu, hesabınızın təhlükəsizliyini artırır
- Hər tətbiq üçün ayrı-ayrı şifrə yarada bilərsiniz

### Gmail üçün App Password yaratmaq:

1. **Gmail hesabınıza daxil olun**
2. **Google Account səhifəsinə gedin**: https://myaccount.google.com/
3. **Sol menyudan "Security" (Təhlükəsizlik) seçin**
4. **"2-Step Verification" (İki addımlı doğrulama) aktiv edin** (əgər aktiv deyilsə)
5. **"App passwords" (Tətbiq şifrələri) bölməsinə gedin**
   - Bəzən "2-Step Verification" altında gizlədilə bilər
6. **"Select app" (Tətbiq seç) dropdown-dan "Mail" seçin**
7. **"Select device" (Cihaz seç) dropdown-dan "Other (Custom name)" seçin**
8. **Ad daxil edin** (məs: "Online Exam Platform")
9. **"Generate" (Yarat) düyməsinə basın**
10. **16 rəqəmli şifrəni kopyalayın** - bu sizin App Password-unuzdur
    - Format: `xxxx xxxx xxxx xxxx` (boşluqlar olmadan istifadə edin)

**⚠️ Diqqət:** Bu şifrəni yalnız bir dəfə görə bilərsiniz. Onu `.env` faylına dərhal əlavə edin!

## Gmail istifadə etmək üçün:

1. Yuxarıdakı addımları izləyərək App Password yaradın
2. `.env` faylına aşağıdakı dəyişənləri əlavə edin:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App Password (16 rəqəm, boşluqlar olmadan)
SMTP_FROM=your-email@gmail.com
```

**Nümunə:**

```env
SMTP_USER=kenanrehimli48@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Bu yalnız nümunədir, öz App Password-unuzu istifadə edin
```

## Digər email provider-lər üçün:

### Outlook/Hotmail:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

### Yahoo:

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@yahoo.com
```

### Custom SMTP Server:

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

## Digər Email Provider-lər üçün:

### Outlook/Hotmail:

- Outlook üçün də App Password lazımdır
- Microsoft Account → Security → Advanced security options → App passwords

### Yahoo:

- Yahoo üçün də App Password lazımdır
- Account Security → Generate app password

### Yandex:

- Yandex üçün də xüsusi şifrə lazımdır
- Security → App passwords

## Qeyd:

- `SMTP_SECURE=true` port 465 üçün istifadə olunur (SSL)
- `SMTP_SECURE=false` port 587 və ya 25 üçün istifadə olunur (TLS)
- **Gmail, Outlook, Yahoo üçün mütləq "App Password" istifadə edin, adi şifrə işləməyəcək**
- App Password 16 rəqəmli şifrədir (boşluqlar olmadan yazın)
- Production mühitində mütləq environment variables təyin edin
- App Password-unuzu heç kimlə paylaşmayın

## Test:

Email servisi quraşdırıldıqdan sonra şifrə bərpası funksionallığını test edə bilərsiniz. Email-lər real olaraq göndəriləcək.

## Problemlər və Həllər:

### "535 Authentication failed" xətası:

- App Password düzgün kopyalanmayıb - yenidən yoxlayın
- 2-Step Verification aktiv deyil - aktiv edin
- Şifrədə boşluqlar var - boşluqları silin

### Email göndərilmir:

- SMTP_HOST, SMTP_PORT düzgün təyin olunubmu yoxlayın
- Firewall SMTP portunu bloklayır - port 587 və ya 465 açıq olmalıdır
- Email provider rate limit-ə çatıb - bir az gözləyin
