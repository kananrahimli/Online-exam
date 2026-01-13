#!/bin/sh
set -e

echo "🚀 Backend container başladı..."

# NODE_ENV yoxlanılır
NODE_ENV=${NODE_ENV:-development}

# node_modules yoxlanılır və yüklənir
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "📦 node_modules tapılmadı, yüklənir..."
  npm ci
  echo "✅ node_modules yükləndi"
else
  echo "✅ node_modules mövcuddur"
fi

# Prisma Client generate edilir
echo "🔧 Prisma Client generate edilir..."
npx prisma generate

# Migration-lər işə salınır
echo "🔄 Database migration-ləri işə salınır..."
npx prisma migrate deploy || echo "⚠️ Migration xətası (normal ola bilər)"

# Development və ya Production moduna görə server işə salınır
if [ "$NODE_ENV" = "production" ]; then
  # dist/ qovluğunu yoxla
  if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "⚠️ dist/ qovluğu tapılmadı, build edilir..."
    npm run build
    echo "✅ Build tamamlandı"
  else
    echo "✅ dist/ mövcuddur"
  fi
  echo "🎯 Production server işə salınır..."
  exec npm run start:prod
else
  echo "🔧 Development server işə salınır (hot reload aktivdir)..."
  exec npm run dev
fi