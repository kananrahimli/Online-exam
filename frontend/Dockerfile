# Frontend Dockerfile
# Bu fayl frontend (Next.js) servisini Docker container-ında işə salmaq üçün istifadə olunur

# Addım 1: Node.js 18 Alpine image-i seçirik
FROM node:18-alpine AS base

# Addım 2: İş qovluğunu təyin edirik
WORKDIR /app

# Addım 3: package.json və package-lock.json fayllarını kopyalayırıq
COPY package*.json ./

# Addım 4: Dependencies-ləri quraşdırırıq
RUN npm ci && npm cache clean --force

# Addım 5: Source code-u kopyalayırıq
COPY . .

# Addım 6: Next.js build edirik
RUN npm run build

# Addım 7: Entrypoint script-i kopyalayırıq və icazə veririk
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Addım 8: Production server-i işə salırıq
EXPOSE 3000

# Entrypoint script-i işə salırıq
ENTRYPOINT ["./docker-entrypoint.sh"]

