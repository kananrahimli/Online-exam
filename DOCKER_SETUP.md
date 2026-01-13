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

   Əgər komandalar işləmirsə:

   - Terminal-i yenidən başladın
   - Docker Desktop-un işlədiyini yoxlayın (menyu bar-da ikon)
   - Sistem yenidən başlatma tələb oluna bilər

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

### Docker Quraşdırılmasını Yoxlamaq

Docker quraşdırılıb-yoxlanılmadığını yoxlamaq üçün:

```bash
docker --version
docker-compose --version
```

Əgər `command not found` xətası alırsınızsa:

1. Docker Desktop-un işlədiyini yoxlayın
2. Terminal-i yenidən başladın
3. Sistem yenidən başlatma tələb oluna bilər

## 🚀 Addım-Addım Quraşdırma

### Addım 1: Environment Variables Təyin Etmək

1. Proyektin root qovluğunda `.env` faylını yaradın və lazımi dəyərləri doldurun.

2. **Vacib:** Bu proyekt Supabase database istifadə edir. `.env` faylında aşağıdakı dəyərlər olmalıdır:

   ```bash
   # Database (Supabase)
   DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
   DIRECT_URL="postgresql://user:password@host:port/database"

   # Application
   PORT=3002
   JWT_SECRET="your-jwt-secret-key"
   FRONTEND_URL="http://localhost:3000"

   # Email Configuration
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

### Addım 3: Database Migration-ləri İşə Salmaq

**Qeyd:** Migration-lər avtomatik olaraq işə salınır (docker-compose.yml-də `command` bölməsinə baxın).

Əgər manual olaraq işə salmaq istəyirsinizsə:

```bash
# Backend container-ına daxil olmaq
docker-compose exec backend sh

# Container içində migration-ləri işə salmaq
npx prisma migrate deploy
npx prisma generate
```

**Vacib:** Supabase database-iniz hazır olmalıdır və `.env` faylında `DATABASE_URL` və `DIRECT_URL` düzgün təyin olunmalıdır.

### Addım 4: Container-ləri İşə Salmaq

Bütün servisləri (Backend, Frontend) birlikdə işə salmaq:

```bash
docker-compose up -d
```

`-d` flag-i container-ləri background-da işə salır (detached mode).

**Vacib sual: `docker-compose up -d` development və ya production üçündürmü?**

**Cavab: Hər ikisi üçün istifadə oluna bilər!** Fərq `.env` faylında `NODE_ENV` dəyərindən asılıdır:

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

**Qeyd:** `docker-compose up -d` komandası eynidir, fərq yalnız `.env` faylındakı `NODE_ENV` dəyərindədir!

### Addım 5: Status-u Yoxlamaq

Container-lərin işləyib-işləmədiyini yoxlamaq:

```bash
docker-compose ps
```

Bütün container-lər `Up` statusunda olmalıdır.

### Addım 6: Log-ları Görmək

Container-lərin log-larını görmək:

```bash
# Bütün log-lar
docker-compose logs -f

# Yalnız backend log-ları
docker-compose logs -f backend

# Yalnız frontend log-ları
docker-compose logs -f frontend

# Yalnız database log-ları
docker-compose logs -f postgres
```

## 🌐 İstifadə

Container-lər işə salındıqdan sonra:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002 (və ya `.env` faylında təyin etdiyiniz PORT)
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
- Image-ləri hazırlamaq istəyirsiniz, sonra manual olaraq işə salacaqsınız

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

#### Praktik nümunələr:

**Seçim 1: Ayrı-ayrı (2 addım)**

```bash
# Addım 1: Build et
docker-compose build

# Addım 2: İşə sal
docker-compose up -d
```

**Seçim 2: Birlikdə (1 addım) - Tövsiyə olunur**

```bash
# Build et VƏ işə sal
docker-compose up -d --build
```

**Qeyd:** Əgər image-lər artıq build edilibsə və dəyişiklik yoxdursa:

- `docker-compose up -d` - Yalnız container-ləri işə salır (build etmir)
- `docker-compose up -d --build` - Yenidən build edir (hətta dəyişiklik olmasa da)

### Container-ləri Dayandırmaq

```bash
docker-compose stop
```

### Container-ləri Dayandırmaq və Silmək

```bash
docker-compose down
```

### Container-ləri və Volume-ları Silmək (Database data-sı da silinir!)

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

# Database container-ına
docker-compose exec postgres psql -U online_exam -d online_exam
```

## 📁 Fayl Strukturu

```
OnlineExam/
├── docker-compose.yml          # Bütün servisləri təyin edən fayl
├── .env                        # Environment variables (yaradılmalıdır)
├── .env.example                # Environment variables nümunəsi
├── backend/
│   ├── Dockerfile              # Backend üçün Docker image
│   └── .dockerignore           # Backend üçün ignore faylları
└── frontend/
    ├── Dockerfile              # Frontend üçün Docker image
    └── .dockerignore           # Frontend üçün ignore faylları
```

## 🔧 Development vs Production

### NODE_ENV nədir və nə vaxt təyin etməliyik?

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

- Hot reload işləyir
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

### Development Mode

Development üçün `docker-compose.yml`-də volumes mount edilmişdir:

- Source code dəyişiklikləri avtomatik olaraq container-ə əks olunur
- Hot reload işləyir
- `NODE_ENV` təyin etməyin və ya `NODE_ENV=development` yazın

**Development üçün `.env` faylı:**

```env
# NODE_ENV təyin etməyin (default development) və ya:
NODE_ENV=development

# Digər dəyərlər...
DATABASE_URL=...
JWT_SECRET=...
```

### Production Mode

Production üçün:

1. **`.env` faylında `NODE_ENV=production` təyin edin** (vacib!)
2. Image-ləri build edin: `docker-compose build`
3. Container-ləri işə salın: `docker-compose up -d`

**Production üçün `.env` faylı:**

```env
# Mütləq təyin edin!
NODE_ENV=production

# Digər dəyərlər...
DATABASE_URL=...
JWT_SECRET=...
```

### NODE_ENV həmişə .env faylında olmalıdırmı?

**Cavab: Bəli, amma dəyəri mühitdən asılı olaraq dəyişir:**

1. **Development üçün:**

   - `.env` faylında `NODE_ENV=development` yazın və ya
   - Heç təyin etməyin (default development-dir)

2. **Production üçün:**

   - `.env` faylında **mütləq** `NODE_ENV=production` yazın
   - Bu çox vacibdir, çünki:
     - Performans optimallaşdırılır
     - Təhlükəsizlik artırılır
     - Resource istifadəsi azalır

3. **Docker Compose istifadə edərkən:**
   - `docker-compose.yml`-də `NODE_ENV: ${NODE_ENV:-production}` var
   - Bu o deməkdir ki, `.env` faylında `NODE_ENV` yoxdursa, default `production` olacaq
   - **Amma development üçün mütləq `NODE_ENV=development` yazın!**

### Praktik nümunələr:

**Development üçün `.env`:**

```env
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=dev-secret-key
PORT=3002
```

**Production üçün `.env`:**

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=super-secure-production-key
PORT=3002
```

**Qeyd:** Production-da `.env` faylını Git-ə commit etməyin! `.env.example` istifadə edin.

**Production Build Prosesi - Addım-Addım:**

#### Backend Build Prosesi:

1. **Dependencies yüklənir:**

   ```bash
   npm ci  # package-lock.json-dan dəqiq versiyalar yüklənir
   ```

2. **Prisma Client generate edilir:**

   ```bash
   npx prisma generate  # Database schema-sından TypeScript client yaradılır
   ```

3. **TypeScript kod build edilir:**

   ```bash
   npm run build  # src/ qovluğundakı kod dist/ qovluğuna compile edilir
   ```

4. **Production dependencies yüklənir:**

   ```bash
   npm ci --only=production  # Yalnız production dependencies (dev dependencies silinir)
   ```

5. **Container başladıqda:**
   - `docker-entrypoint.sh` script işə düşür
   - `NODE_ENV` yoxlanılır
   - **Development modunda (`NODE_ENV=development`):**
     - `node_modules` yoxlanılır, yoxdursa yüklənir
     - Prisma Client generate edilir
     - Database migration-ləri işə salınır
     - **Build edilmir!** Yalnız `npm run dev` işə salınır (hot reload)
   - **Production modunda (`NODE_ENV=production`):**
     - `node_modules` yoxlanılır, yoxdursa yüklənir
     - Prisma Client generate edilir
     - Database migration-ləri işə salınır
     - Build edilmiş fayllar istifadə olunur
     - Production server (`npm run start:prod`) işə salınır

#### Frontend Build Prosesi:

1. **Dependencies yüklənir:**

   ```bash
   npm ci  # package-lock.json-dan dəqiq versiyalar yüklənir
   ```

2. **Next.js build edilir:**

   ```bash
   npm run build  # React komponentləri optimize edilir, static pages yaradılır
   ```

   - Static pages `.next/static/` qovluğunda yaradılır
   - Server-side rendering üçün kod hazırlanır
   - Assets optimize edilir və minify olunur

3. **Container başladıqda:**
   - `docker-entrypoint.sh` script işə düşür
   - `NODE_ENV` yoxlanılır
   - **Development modunda (`NODE_ENV=development`):**
     - `node_modules` yoxlanılır, yoxdursa yüklənir
     - **Build edilmir!** Yalnız `npm run dev` işə salınır (hot reload)
   - **Production modunda (`NODE_ENV=production`):**
     - `node_modules` yoxlanılır, yoxdursa yüklənir
     - `.next` build qovluğu yoxlanılır, yoxdursa build edilir
     - Next.js production server (`npm run start`) işə salınır

**Qeyd:** İlk dəfə `docker-compose up` edəndə:

- `node_modules` avtomatik yüklənir (həm backend, həm də frontend üçün)
- Backend üçün Prisma Client generate edilir
- Frontend üçün Next.js build edilir
- Bütün proses avtomatikdir, manual müdaxilə lazım deyil

**Niyə `NODE_ENV=production` təyin etməliyik?**

`NODE_ENV=production` təyin etmək çox vacibdir, çünki:

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

4. **Framework xüsusiyyətləri:**

   - Next.js production build-də optimallaşdırılmış kod yaradır
   - NestJS production modunda daha sürətli işləyir
   - Hot reload və development tool-ları deaktiv olur

5. **Log və monitoring:**
   - Production log-ları daha strukturlaşdırılmış olur
   - Development console.log-ları gizlədilir
   - Monitoring tool-ları düzgün işləyir

**Qeyd:** Development üçün `NODE_ENV=development` və ya heç təyin etməyin (default development-dir).

## 🐛 Problemlər və Həllər

### Problem 1: Port artıq istifadə olunur

**Xəta:** `Error: bind: address already in use`

**Həll:**

```bash
# Port-u dəyişdirin .env faylında
BACKEND_PORT=3002
FRONTEND_PORT=3001
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

### Problem 5: Migration xətası

**Xəta:** `Migration failed`

**Həll:**

```bash
# Database container-ına daxil olun
docker-compose exec backend sh

# Migration-ləri manual olaraq işə salın
npx prisma migrate deploy
npx prisma generate
```

## 📊 Database Backup və Restore

**Qeyd:** Bu proyekt Supabase istifadə edir, ona görə database backup/restore Supabase dashboard-dan edilməlidir.

### Supabase-dən Backup

1. Supabase Dashboard-a daxil olun
2. Database → Backups bölməsinə keçin
3. Backup yaradın və ya mövcud backup-lardan birini seçin

### Local Backup (pg_dump ilə)

```bash
# Supabase connection string ilə backup
pg_dump "postgresql://user:password@host:port/database" > backup.sql
```

### Restore

```bash
# Backup-dan restore etmək
psql "postgresql://user:password@host:port/database" < backup.sql
```

## 🔒 Təhlükəsizlik

1. **Production mühitində:**

   - `.env` faylında bütün default şifrələri dəyişdirin
   - `JWT_SECRET`-i güclü bir dəyərlə əvəz edin
   - Database şifrəsini güclü edin
   - `.env` faylını Git-ə commit etməyin!

2. **Firewall:**
   - Yalnız lazımi port-ları açın (3000, 3001)
   - Database port-unu (5432) yalnız localhost üçün açın

## 📝 Qeydlər

- İlk dəfə işə salarkən database migration-ləri avtomatik olaraq işə salınır
- Database data-sı `postgres_data` volume-unda saxlanılır
- Container-ləri silmək database data-sını silmir (volume saxlanılır)
- Database data-sını tam silmək üçün: `docker-compose down -v`

## 🆘 Yardım

Əgər problem yaşayırsınızsa:

1. Log-ları yoxlayın: `docker-compose logs`
2. Container status-unu yoxlayın: `docker-compose ps`
3. Container-ləri yenidən başladın: `docker-compose restart`
