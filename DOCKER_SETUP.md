# Docker Setup Guide - Addım-Addım Təlimat

Bu sənəd proyekti Docker istifadə edərək işə salmaq üçün izahli təlimatlar verir.

## 📋 Tələblər

Docker-izasiya üçün aşağıdakı proqramlar quraşdırılmış olmalıdır:

- **Docker Desktop** (macOS/Windows üçün) və ya **Docker Engine** (Linux üçün)
- **Docker Compose** (Docker Desktop ilə birlikdə gəlir)

### Docker Quraşdırılması

#### macOS üçün:

1. **Docker Desktop yükləyin:**

   - https://www.docker.com/products/docker-desktop/ səhifəsinə gedin
   - "Download for Mac" düyməsinə basın
   - Sisteminizə uyğun versiyanı seçin:
     - **Apple Silicon (M1/M2/M3)** üçün: "Mac with Apple chip"
     - **Intel** üçün: "Mac with Intel chip"
   - `.dmg` faylını yükləyin və quraşdırın

2. **Docker Desktop-u işə salın:**

   - Applications qovluğundan Docker Desktop-u açın
   - İlk dəfə açılanda sistem icazələri tələb oluna bilər
   - Docker Desktop-un işlədiyini yoxlayın (menyu bar-da Docker ikonu görünməlidir)

3. **Quraşdırmanı yoxlayın:**
   ```bash
   docker --version
   docker-compose --version
   ```

#### Linux üçün:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# CentOS/RHEL
sudo yum install docker docker-compose

# Docker-u işə salmaq
sudo systemctl start docker
sudo systemctl enable docker
```

#### Windows üçün:

1. **Docker Desktop yükləyin:**

   - https://www.docker.com/products/docker-desktop/ səhifəsinə gedin
   - "Download for Windows" düyməsinə basın
   - `.exe` faylını yükləyin və quraşdırın

2. **WSL 2 quraşdırın** (Docker Desktop tələb edir)
   - Docker Desktop quraşdırma zamanı avtomatik olaraq quraşdırılır

## 🚀 Addım-Addım Quraşdırma

### Addım 1: Environment Variables Təyin Etmək

1. Proyektin root qovluğunda `.env` faylını yaradın və lazımi dəyərləri doldurun.

2. **Vacib:** Bu proyekt Supabase database istifadə edir. `.env` faylında aşağıdakı dəyərlər olmalıdır:

   ```env
   # Database (Supabase)
   DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
   DIRECT_URL="postgresql://user:password@host:port/database"

   # Application
   PORT=3002
   NODE_ENV=development  # və ya production
   JWT_SECRET="your-jwt-secret-key"
   FRONTEND_URL="http://localhost:3000"

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com

   # PayRiff Configuration
   PAYRIFF_SECRET_KEY=your_payriff_secret_key
   PAYRIFF_MERCHANT=your_merchant_id
   PAYRIFF_BASE_URL=https://api.payriff.com/api/v3
   BACKEND_URL=http://localhost:3002

   # Stripe Configuration (əgər istifadə edirsinizsə)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # OpenAI Configuration (əgər istifadə edirsinizsə)
   OPENAI_API_KEY=your_openai_api_key

   # Exam Configuration
   REQUIRE_TRANSFERS_FOR_EXAM=false

   # Frontend
   FRONTEND_PORT=3000
   NEXT_PUBLIC_API_URL=http://localhost:3002
   ```

3. **Qeyd:** Local PostgreSQL container-i lazım deyil, çünki Supabase istifadə olunur.

### Addım 2: Docker Image-ləri Build Etmək

Backend və Frontend üçün Docker image-ləri yaratmaq:

```bash
docker-compose build
```

Bu əmr:

- Backend üçün Dockerfile-ı oxuyur və image yaradır
- Frontend üçün Dockerfile-ı oxuyur və image yaradır
- Dependencies-ləri quraşdırır və build edir

**İlk dəfə build edərkən bir neçə dəqiqə çəkə bilər.**

### Addım 3: Container-ləri İşə Salmaq

Bütün servisləri (Backend, Frontend) birlikdə işə salmaq:

```bash
docker-compose up -d
```

`-d` flag-i container-ləri background-da işə salır (detached mode).

**Vacib:** `docker-compose up -d` komandası həm development, həm də production üçün istifadə oluna bilər. Fərq `.env` faylında `NODE_ENV` dəyərindən asılıdır:

#### Development üçün:

1. `.env` faylında `NODE_ENV=development` yazın və ya heç təyin etməyin
2. `docker-compose up -d` işə salın
3. Nəticə:
   - Hot reload işləyir
   - Debug məlumatları görünür
   - Development tool-ları aktivdir

#### Production üçün:

1. `.env` faylında `NODE_ENV=production` yazın (mütləq!)
2. `docker-compose up -d` işə salın
3. Nəticə:
   - Optimallaşdırılmış performans
   - Debug məlumatları gizlədilir
   - Production optimizasiyaları aktivdir

### Addım 4: Status-u Yoxlamaq

Container-lərin işləyib-işləmədiyini yoxlamaq:

```bash
docker-compose ps
```

Bütün container-lər `Up` statusunda olmalıdır.

### Addım 5: Log-ları Görmək

Container-lərin log-larını görmək:

```bash
# Bütün log-lar
docker-compose logs -f

# Yalnız backend log-ları
docker-compose logs -f backend

# Yalnız frontend log-ları
docker-compose logs -f frontend
```

## 🌐 İstifadə

Container-lər işə salındıqdan sonra:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002
- **Database:** Supabase (cloud database, local deyil)

## 🛠️ Əsas Əmrlər

### `docker-compose build` vs `docker-compose up -d --build`

**Fərq:**

#### 1. `docker-compose build`

- **Yalnız image-ləri build edir**
- Container-ləri işə salmır
- Build edilmiş image-lər hazır olur, amma container-lər işləmir

```bash
docker-compose build
# Nəticə: Image-lər build edilir, amma container-lər işə salınmır
```

**Nə vaxt istifadə edilir:**

- Image-ləri build etmək istəyirsiniz, amma hələ container-ləri işə salmaq istəmirsiniz
- Build prosesini test etmək istəyirsiniz

#### 2. `docker-compose up -d --build`

- **Image-ləri build edir VƏ container-ləri işə salır**
- İki əmri birlikdə yerinə yetirir: `build` + `up -d`
- Daha praktik və tez

```bash
docker-compose up -d --build
# Nəticə: Image-lər build edilir VƏ container-lər işə salınır
```

**Nə vaxt istifadə edilir:**

- Image-ləri build etmək VƏ dərhal container-ləri işə salmaq istəyirsiniz
- Ən çox istifadə olunan komanda
- Development və production üçün ən praktik yol

### Container-ləri Dayandırmaq

```bash
docker-compose stop
```

### Container-ləri Dayandırmaq və Silmək

```bash
docker-compose down
```

### Container-ləri və Volume-ları Silmək

```bash
docker-compose down -v
```

### Container-ləri Yenidən Build Etmək (Cache olmadan)

```bash
docker-compose build --no-cache
```

### Container-ləri Yenidən İşə Salmaq

```bash
docker-compose restart
```

### Container-ə Daxil Olmaq

```bash
# Backend container-ına
docker-compose exec backend sh

# Frontend container-ına
docker-compose exec frontend sh
```

## 📁 Fayl Strukturu

```
OnlineExam/
├── docker-compose.yml          # Bütün servisləri təyin edən fayl
├── .env                        # Environment variables (yaradılmalıdır)
├── backend/
│   ├── Dockerfile              # Backend üçün Docker image
│   ├── docker-entrypoint.sh   # Backend container başladıqda işə düşən script
│   └── .dockerignore           # Backend üçün ignore faylları
└── frontend/
    ├── Dockerfile              # Frontend üçün Docker image
    ├── docker-entrypoint.sh   # Frontend container başladıqda işə düşən script
    └── .dockerignore           # Frontend üçün ignore faylları
```

## 🔧 Development vs Production

### NODE_ENV nədir?

`NODE_ENV` environment variable-ı development və production mühitləri arasında fərq qoymaq üçün istifadə olunur.

#### Development üçün:

**Seçim 1: Heç təyin etməyin (tövsiyə olunur)**

```env
# .env faylında NODE_ENV yoxdur (default: development)
```

**Seçim 2: Açıq şəkildə təyin edin**

```env
NODE_ENV=development
```

**Development xüsusiyyətləri:**

- Hot reload işləyir (kod dəyişiklikləri avtomatik yenilənir)
- Debug məlumatları görünür
- Development tool-ları aktivdir
- Daha detallı xəta mesajları

#### Production üçün:

**Mütləq təyin edin:**

```env
NODE_ENV=production
```

**Production xüsusiyyətləri:**

- Optimallaşdırılmış performans
- Debug məlumatları gizlədilir
- Development tool-ları deaktivdir
- Minimal xəta mesajları (təhlükəsizlik üçün)

### Niyə `NODE_ENV=production` təyin etməliyik?

1. **Performans optimallaşdırması:**

   - Node.js production modunda daha sürətli işləyir
   - Kod optimallaşdırılır və cache-lər aktivləşir
   - Gereksiz development tool-ları deaktiv olur

2. **Təhlükəsizlik:**

   - Development debug məlumatları gizlədilir
   - Xəta mesajları istifadəçiyə detallı məlumat vermir
   - Sensitive məlumatlar log-larda görünmür

3. **Resource istifadəsi:**
   - Development dependencies yüklənmir
   - Daha az memory və CPU istifadə olunur
   - Server daha səmərəli işləyir

## 🔄 Container-lərin Necə İşlədiyi

### Backend Container-i

**Container başladıqda nə baş verir:**

1. `docker-entrypoint.sh` script işə düşür
2. `NODE_ENV` yoxlanılır (development və ya production)
3. `node_modules` yoxlanılır - yoxdursa avtomatik yüklənir
4. Prisma Client generate edilir
5. Database migration-ləri işə salınır
6. Server işə salınır:
   - **Development modunda:** `npm run dev` (hot reload ilə)
   - **Production modunda:** `npm run start:prod` (build edilmiş kod ilə)

**Backend Dockerfile struktur:**

- **Base stage:** Node.js 18 Alpine, OpenSSL quraşdırılır
- **Dependencies stage:** Bütün dependencies yüklənir, Prisma Client generate edilir
- **Build stage:** TypeScript kod build edilir (`dist/` qovluğuna)
- **Development stage:** Development üçün hazırlanır (hot reload üçün)
- **Production stage:** Production üçün hazırlanır (yalnız production dependencies)

### Frontend Container-i

**Container başladıqda nə baş verir:**

1. `docker-entrypoint.sh` script işə düşür
2. `NODE_ENV` yoxlanılır (development və ya production)
3. `node_modules` yoxlanılır - yoxdursa avtomatik yüklənir
4. Server işə salınır:
   - **Development modunda:** `npm run dev` (hot reload ilə, build edilmir)
   - **Production modunda:** `.next` qovluğu yoxlanılır, yoxdursa build edilir, sonra `npm run start` işə salınır

**Frontend Dockerfile struktur:**

- **Base stage:** Node.js 18 Alpine
- Dependencies yüklənir
- Source code kopyalanır
- Next.js build edilir (production üçün)

### Volume-lar (Data Saxlama)

**Backend:**

- `./backend:/app` - Source code mount olunur (development üçün)
- `backend_node_modules:/app/node_modules` - node_modules ayrı volume-də saxlanılır

**Frontend:**

- `./frontend:/app` - Source code mount olunur (development üçün)
- `frontend_node_modules:/app/node_modules` - node_modules ayrı volume-də saxlanılır
- `frontend_next:/app/.next` - Next.js build cache-i saxlanılır

**Niyə volume-lar istifadə olunur?**

- `node_modules` volume-də saxlanılır ki, container yenidən başladıqda yenidən yüklənməsin
- `.next` cache-i saxlanılır ki, build daha sürətli olsun
- Source code mount olunur ki, development modunda dəyişikliklər dərhal görünsün

## 🐛 Problemlər və Həllər

### Problem 1: Port artıq istifadə olunur

**Xəta:** `Error: bind: address already in use`

**Həll:**

```bash
# Port-u dəyişdirin .env faylında
PORT=3003  # Backend üçün
FRONTEND_PORT=3001  # Frontend üçün
```

Və ya port-u istifadə edən prosesi tapın və dayandırın:

```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Problem 2: Database connection xətası

**Xəta:** `Error: P1001: Can't reach database server`

**Həll:**

1. `.env` faylında `DATABASE_URL` və `DIRECT_URL`-in düzgün olduğunu yoxlayın
2. Supabase database-inizin aktiv olduğunu yoxlayın
3. Network connection-unuzu yoxlayın (Supabase cloud database-dir)
4. Database credentials-lərin düzgün olduğunu təsdiq edin

### Problem 3: Permission xətası

**Xəta:** `EACCES: permission denied`

**Həll:**

```bash
# Linux/macOS üçün
sudo chown -R $USER:$USER .
```

### Problem 4: Build xətası

**Xəta:** Build zamanı dependency xətası

**Həll:**

```bash
# Cache-i təmizləyin və yenidən build edin
docker-compose build --no-cache
```

### Problem 5: Module not found xətası

**Xəta:** `Cannot find module '@nestjs/common'` və ya başqa modullar

**Həll:**

1. Container-i yenidən başladın:

   ```bash
   docker-compose restart backend
   ```

2. Container-ə daxil olun və dependencies yükləyin:

   ```bash
   docker-compose exec backend sh
   npm install
   exit
   ```

3. Container-i yenidən başladın:
   ```bash
   docker-compose restart backend
   ```

### Problem 6: Prisma xətası

**Xəta:** `PrismaClientInitializationError` və ya OpenSSL xətası

**Həll:**

1. Container-i yenidən başladın (Prisma Client avtomatik generate olunur)
2. Əgər problem davam edərsə:
   ```bash
   docker-compose exec backend sh
   npx prisma generate
   exit
   ```

## 📊 Database Migration-ləri

**Qeyd:** Migration-lər avtomatik olaraq işə salınır (docker-entrypoint.sh script-də).

Əgər manual olaraq işə salmaq istəyirsinizsə:

```bash
# Backend container-ına daxil olmaq
docker-compose exec backend sh

# Container içində migration-ləri işə salmaq
npx prisma migrate deploy
npx prisma generate
exit
```

**Vacib:** Supabase database-iniz hazır olmalıdır və `.env` faylında `DATABASE_URL` və `DIRECT_URL` düzgün təyin olunmalıdır.

## 🔒 Təhlükəsizlik

1. **Production mühitində:**

   - `.env` faylında bütün default şifrələri dəyişdirin
   - `JWT_SECRET`-i güclü bir dəyərlə əvəz edin
   - Database şifrəsini güclü edin
   - `.env` faylını Git-ə commit etməyin!

2. **Firewall:**
   - Yalnız lazımi port-ları açın (3000, 3002)
   - Database port-unu (5432) yalnız localhost üçün açın

## 📝 Qeydlər

- İlk dəfə işə salarkən database migration-ləri avtomatik olaraq işə salınır
- Container-ləri silmək database data-sını silmir (Supabase cloud-dadır)
- `node_modules` volume-lərdə saxlanılır ki, container yenidən başladıqda yenidən yüklənməsin
- Development modunda source code dəyişiklikləri avtomatik olaraq container-ə əks olunur (hot reload)

## 🆘 Yardım

Əgər problem yaşayırsınızsa:

1. Log-ları yoxlayın: `docker-compose logs`
2. Container status-unu yoxlayın: `docker-compose ps`
3. Container-ləri yenidən başladın: `docker-compose restart`
4. Container-ləri tam silin və yenidən yaradın: `docker-compose down && docker-compose up -d --build`
