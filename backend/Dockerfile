# Backend Dockerfile (Düzəldilmiş)
# Multi-stage build: development və production ayrı-ayrı

# ==================== BASE STAGE ====================
FROM node:18-alpine AS base
WORKDIR /app

# OpenSSL quraşdır (Prisma üçün)
RUN apk add --no-cache openssl

# Package fayllarını kopyala
COPY package*.json ./
COPY prisma ./prisma/

# ==================== DEPENDENCIES STAGE ====================
FROM base AS dependencies

# Bütün dependencies quraşdır (dev + prod)
RUN npm ci

# Prisma Client generate et
RUN npx prisma generate

# ==================== BUILD STAGE ====================
FROM dependencies AS build

# Source code-u kopyala
COPY . .

# NestJS build et
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM node:18-alpine AS production
WORKDIR /app

# OpenSSL quraşdır (Prisma üçün)
RUN apk add --no-cache openssl

# Package fayllarını kopyala
COPY package*.json ./
COPY prisma ./prisma/

# YALNIZ production dependencies quraşdır
RUN npm ci --only=production

# Prisma Client yenidən generate et (production üçün)
RUN npx prisma generate

# Build olunmuş faylları kopyala
COPY --from=build /app/dist ./dist

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3002
ENTRYPOINT ["./docker-entrypoint.sh"]

# ==================== DEVELOPMENT STAGE ====================
FROM dependencies AS development
WORKDIR /app

# Source code mount olunacaq (docker-compose-dən)
# Bütün dependencies artıq var
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3002
ENTRYPOINT ["./docker-entrypoint.sh"]